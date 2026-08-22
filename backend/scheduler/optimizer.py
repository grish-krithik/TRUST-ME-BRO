import time
from ortools.sat.python import cp_model
from .models import (
    Train, Segment, ScheduleResult, TrainSchedule,
    SegmentSchedule, compute_summary, TrainClass
)
from .topology import (
    TRAINS, SEGMENTS, STATIONS, STATION_MAP,
    get_train_segments, get_train_station_order,
)
from typing import Dict, List

def get_dynamic_headway(train_class: TrainClass) -> int:
    """
    PHYSICS-AWARE DYNAMIC HEADWAYS (Kavach Moving Block)
    """
    if train_class == TrainClass.RAJDHANI:
        return 3
    elif train_class == TrainClass.FREIGHT:
        return 7
    return 5

def solve_optimized() -> ScheduleResult:
    model = cp_model.CpModel()
    HORIZON = 4320 # 72 hours, perfectly covers any overnight 24h cycle delays

    entry_vars: Dict[str, Dict[str, cp_model.IntVar]] = {}
    exit_vars:  Dict[str, Dict[str, cp_model.IntVar]] = {}

    for train in TRAINS:
        entry_vars[train.id] = {}
        exit_vars[train.id]  = {}
        segments = get_train_segments(train)
        for j, seg in enumerate(segments):
            entry_vars[train.id][seg.name] = model.new_int_var(0, HORIZON, f"entry_{train.id}_{seg.name}")
            exit_vars[train.id][seg.name] = model.new_int_var(0, HORIZON, f"exit_{train.id}_{seg.name}")

    # Constraint 1: Duration
    for train in TRAINS:
        segments = get_train_segments(train)
        for j, seg in enumerate(segments):
            duration = train.segment_durations[j]
            model.add(exit_vars[train.id][seg.name] == entry_vars[train.id][seg.name] + duration)

    # Constraint 2: Sequence
    for train in TRAINS:
        segments = get_train_segments(train)
        for j in range(len(segments) - 1):
            model.add(entry_vars[train.id][segments[j + 1].name] >= exit_vars[train.id][segments[j].name])

    # Constraint 3: Timetable Entry
    for train in TRAINS:
        segments = get_train_segments(train)
        first_seg = segments[0]
        model.add(entry_vars[train.id][first_seg.name] >= train.entry_time)

    # Constraint 4: Kavach Dynamic Headway & Exclusion
    for seg in SEGMENTS:
        if seg.is_single_line:
            track_groups = {"single": TRAINS}
        else:
            track_groups = {
                "UP": [t for t in TRAINS if t.direction.value == "right"],
                "DOWN": [t for t in TRAINS if t.direction.value == "left"]
            }
            
        for track_name, trains_in_track in track_groups.items():
            padded_intervals = []
            for train in trains_in_track:
                train_segments = get_train_segments(train)
                seg_names = [s.name for s in train_segments]
                if seg.name not in seg_names: continue
                
                j = seg_names.index(seg.name)
                duration = train.segment_durations[j]
                entry = entry_vars[train.id][seg.name]
                
                headway = get_dynamic_headway(train.train_class)
                padded_duration = duration + headway
                
                padded_end = model.new_int_var(0, HORIZON + 15, f"padded_exit_{train.id}_{seg.name}_{track_name}")
                model.add(padded_end == entry + padded_duration)
                padded_interval = model.new_interval_var(entry, padded_duration, padded_end, f"padded_interval_{train.id}_{seg.name}_{track_name}")
                padded_intervals.append(padded_interval)
                
            if len(padded_intervals) > 1:
                model.add_no_overlap(padded_intervals)

    # Constraint 5: Loop line capacity
    station_dwell_intervals: Dict[str, list] = {s.name: [] for s in STATIONS}
    station_dwell_demands:   Dict[str, list] = {s.name: [] for s in STATIONS}

    for train in TRAINS:
        segments = get_train_segments(train)
        station_order = get_train_station_order(train)
        for j in range(len(segments) - 1):
            intermediate_station = station_order[j + 1]
            dwell_start = exit_vars[train.id][segments[j].name]
            dwell_end   = entry_vars[train.id][segments[j + 1].name]
            dwell_dur = model.new_int_var(0, HORIZON, f"dwell_dur_{train.id}_{intermediate_station}")
            model.add(dwell_dur == dwell_end - dwell_start)
            dwell_interval = model.new_interval_var(dwell_start, dwell_dur, dwell_end, f"dwell_{train.id}_{intermediate_station}")
            station_dwell_intervals[intermediate_station].append(dwell_interval)
            station_dwell_demands[intermediate_station].append(1)

    for station in STATIONS:
        intervals = station_dwell_intervals[station.name]
        if station.has_loop_line and len(intervals) > 0:
            model.add_cumulative(intervals, station_dwell_demands[station.name], station.loop_capacity)

    # Objective
    delay_vars: List[cp_model.IntVar] = []
    delay_weights: List[int] = []
    for train in TRAINS:
        segments = get_train_segments(train)
        last_seg = segments[-1]
        delay = model.new_int_var(0, HORIZON, f"delay_{train.id}")
        model.add(delay >= exit_vars[train.id][last_seg.name] - train.ideal_finish_time)
        delay_vars.append(delay)
        delay_weights.append(train.weight)

    model.minimize(cp_model.LinearExpr.weighted_sum(delay_vars, delay_weights))

    # SOLVE
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.num_workers = 8

    start_time = time.time()
    status = solver.solve(model)
    solve_duration = time.time() - start_time

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("Overconstrained instance. Check capacities.")

    train_schedules: List[TrainSchedule] = []
    for i, train in enumerate(TRAINS):
        segments = get_train_segments(train)
        seg_schedules = []
        eco_coasting = 0
        
        for j, seg in enumerate(segments):
            entry = solver.value(entry_vars[train.id][seg.name])
            exit_time = solver.value(exit_vars[train.id][seg.name])
            seg_schedules.append(SegmentSchedule(segment_name=seg.name, entry_time=entry, exit_time=exit_time))
            
            if j > 0:
                prev_exit = solver.value(exit_vars[train.id][segments[j-1].name])
                dwell = entry - prev_exit
                if dwell > 0:
                    eco_coasting += dwell

        actual_finish = seg_schedules[-1].exit_time
        train_schedules.append(TrainSchedule(
            train_id=train.id,
            train_class=train.train_class.display_name,
            priority_weight=train.weight,
            direction=train.direction.value,
            segments=seg_schedules,
            scheduled_finish=train.ideal_finish_time,
            actual_finish=actual_finish,
            delay=max(0, actual_finish - train.ideal_finish_time),
            eco_coasting_minutes=eco_coasting
        ))

    summary = compute_summary(train_schedules, solve_duration)
    return ScheduleResult(trains=train_schedules, summary=summary)
