"""
Chennai-Coimbatore Section Topology (Southern Railway)
Major Junctions: MAS -> AJJ -> KPD -> SA -> ED -> CBE
"""
from typing import List, Dict
from .models import Train, Station, Segment, TrainClass, Direction

# ─── 1. Physical Infrastructure (Track & Stations) ───────────────

STATIONS = [
    Station(name="MAS", has_loop_line=True, loop_capacity=5),  
    Station(name="AJJ", has_loop_line=True, loop_capacity=3),  
    Station(name="KPD", has_loop_line=True, loop_capacity=4),  
    Station(name="SA",  has_loop_line=True, loop_capacity=3),  
    Station(name="ED",  has_loop_line=True, loop_capacity=3),  
    Station(name="CBE", has_loop_line=True, loop_capacity=5),  
]

STATION_MAP = {s.name: s for s in STATIONS}
STATION_NAMES = [s.name for s in STATIONS]

SEGMENTS = [
    Segment("MAS", "AJJ", is_single_line=False), 
    Segment("AJJ", "KPD", is_single_line=True),  # Modeled as bottleneck (Historical constraint)
    Segment("KPD", "SA",  is_single_line=False), 
    Segment("SA",  "ED",  is_single_line=True),  # Ghat section / Congestion block
    Segment("ED",  "CBE", is_single_line=False), 
]

HEADWAY_MINUTES = 5

# ─── 2. Real-World Train Roster (24-Hour Clock Format) ────────────
# Times are in absolute minutes from 00:00 (Midnight).
# Example: 06:10 AM = (6 * 60) + 10 = 370
# Example: 22:00 PM = (22 * 60) + 00 = 1320

TRAINS = [
    # ---- MORNING SHIFT ----
    # 12675 Kovai Express (Dep MAS 06:10)
    Train(
        id="12675-Kovai", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(6 * 60) + 10,  # 06:10
        segment_durations=[60, 50, 120, 60, 100] 
    ),
    # 20644 Vande Bharat (UP) (Dep CBE 06:00)
    Train(
        id="20644-VandeReturn", train_class=TrainClass.RAJDHANI,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(6 * 60) + 0,   # 06:00
        segment_durations=[85, 50, 105, 45, 55] 
    ),
    # 12243 Shatabdi Express (Dep MAS 07:10)
    Train(
        id="12243-Shatabdi", train_class=TrainClass.RAJDHANI,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(7 * 60) + 10,  # 07:10
        segment_durations=[55, 45, 110, 55, 90] 
    ),

    # ---- AFTERNOON SHIFT ----
    # 20643 Vande Bharat (Dep MAS 14:15)
    Train(
        id="20643-VandeBharat", train_class=TrainClass.RAJDHANI,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(14 * 60) + 15, # 14:15
        segment_durations=[50, 45, 105, 50, 85] 
    ),

    # ---- NIGHT SHIFT (Overnight Trains crossing midnight) ----
    # 12671 Nilgiri Express (Dep MAS 21:05)
    Train(
        id="12671-Nilgiri", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(21 * 60) + 5,  # 21:05
        segment_durations=[70, 60, 130, 70, 110] 
    ),
    # Night Freight Block (Dep MAS 21:30 - causes massive historical delays to Cheran)
    Train(
        id="FRT-Coal-Night", train_class=TrainClass.FREIGHT,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(21 * 60) + 30, # 21:30
        segment_durations=[100, 90, 180, 100, 150] 
    ),
    # 12673 Cheran Express (Dep MAS 22:00)
    Train(
        id="12673-Cheran", train_class=TrainClass.MAIL_EXPRESS,
        origin="MAS", destination="CBE", direction=Direction.RIGHT,
        entry_time=(22 * 60) + 0,  # 22:00
        segment_durations=[65, 55, 125, 65, 105] 
    ),
    # 12674 Cheran Express (UP) (Dep CBE 22:50)
    Train(
        id="12674-Cheran(UP)", train_class=TrainClass.MAIL_EXPRESS,
        origin="CBE", destination="MAS", direction=Direction.LEFT,
        entry_time=(22 * 60) + 50, # 22:50
        segment_durations=[110, 70, 130, 60, 70] 
    ),
]


# ─── 3. Helper Functions ──────────────────────────────────────────

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
