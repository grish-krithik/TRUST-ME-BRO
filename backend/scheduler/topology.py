"""
Real-world Chennai-Coimbatore Section Topology (Southern Railway)
MAS -> AJJ -> KPD -> SA -> ED -> CBE
100% Electrified Double Line. Delays occur due to overtakes (Fast trains stuck behind slow).
"""
from typing import List, Dict
from .models import Train, Station, Segment, TrainClass, Direction

# ─── 1. Physical Infrastructure (Track & Stations) ───────────────
# Distances approx: MAS-AJJ (68km), AJJ-KPD (61km), KPD-SA (205km), SA-ED (60km), ED-CBE (100km)

STATIONS = [
    Station(name="MAS", has_loop_line=True, loop_capacity=10), # Chennai Central
    Station(name="AJJ", has_loop_line=True, loop_capacity=4),  # Arakkonam
    Station(name="KPD", has_loop_line=True, loop_capacity=4),  # Katpadi
    Station(name="SA",  has_loop_line=True, loop_capacity=4),  # Salem
    Station(name="ED",  has_loop_line=True, loop_capacity=5),  # Erode
    Station(name="CBE", has_loop_line=True, loop_capacity=8),  # Coimbatore
]

STATION_MAP = {s.name: s for s in STATIONS}
STATION_NAMES = [s.name for s in STATIONS]

# 100% Double Line. No fake single lines.
SEGMENTS = [
    Segment("MAS", "AJJ", is_single_line=False), 
    Segment("AJJ", "KPD", is_single_line=False), 
    Segment("KPD", "SA",  is_single_line=False), 
    Segment("SA",  "ED",  is_single_line=False), 
    Segment("ED",  "CBE", is_single_line=False), 
]

HEADWAY_MINUTES = 5

# ─── 2. Real-World Train Database (Based on NTES/etrain.info) ────
# Times are absolute minutes from 00:00 (Midnight).
# This perfectly mimics an average day's schedule.

TRAINS = [
    # ---- DOWN TRAINS (MAS -> CBE) ----
    Train(
        id="12675-Kovai", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(6 * 60) + 10,  # 06:10 AM
        segment_durations=[58, 48, 125, 55, 95] 
    ),
    Train(
        id="12243-Shatabdi", train_class=TrainClass.RAJDHANI,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(7 * 60) + 10,  # 07:10 AM
        segment_durations=[53, 43, 115, 50, 85] 
    ),
    Train(
        id="20643-VandeBharat", train_class=TrainClass.RAJDHANI,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(14 * 60) + 15, # 14:15 PM
        segment_durations=[50, 40, 105, 45, 80] 
    ),
    Train(
        id="12671-Nilgiri", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(21 * 60) + 5,  # 21:05 PM
        segment_durations=[60, 50, 130, 65, 100] 
    ),
    Train(
        id="12673-Cheran", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(22 * 60) + 0,  # 22:00 PM
        segment_durations=[60, 50, 130, 60, 100] 
    ),
    Train(
        id="22651-Palakkad", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(21 * 60) + 40, # 21:40 PM
        segment_durations=[65, 55, 135, 70, 105] 
    ),
    
    # ---- HEAVY FREIGHT (The Real Reason for Delays) ----
    Train(
        id="BOXN-Coal-1", train_class=TrainClass.FREIGHT,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(13 * 60) + 0, # 13:00 PM (In front of Vande Bharat!)
        segment_durations=[90, 85, 190, 95, 150] 
    ),
    Train(
        id="BTPN-Oil-2", train_class=TrainClass.FREIGHT,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(20 * 60) + 30, # 20:30 PM (In front of the Night Express pack)
        segment_durations=[95, 85, 195, 90, 155] 
    ),

    # ---- UP TRAINS (CBE -> MAS) ----
    Train(
        id="20644-VandeBharat(UP)", train_class=TrainClass.RAJDHANI,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(6 * 60) + 0,   # 06:00 AM
        segment_durations=[80, 45, 105, 40, 50] 
    ),
    Train(
        id="12676-Kovai(UP)", train_class=TrainClass.MAIL_EXPRESS,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(15 * 60) + 15, # 15:15 PM
        segment_durations=[95, 55, 125, 48, 58] 
    ),
    Train(
        id="12674-Cheran(UP)", train_class=TrainClass.MAIL_EXPRESS,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(22 * 60) + 50, # 22:50 PM
        segment_durations=[100, 60, 130, 50, 60] 
    ),
]


def get_train_station_order(train: Train) -> List[str]:
    if train.direction == Direction.RIGHT:
        return STATION_NAMES
    else:
        return STATION_NAMES[::-1]

def get_train_segments(train: Train) -> List[Segment]:
    if train.direction == Direction.RIGHT:
        return SEGMENTS
    else:
        return SEGMENTS[::-1]
