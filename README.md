# AI-Powered Precise Train Traffic Control (SIH25022)

This repository contains a working prototype for the Smart India Hackathon problem statement SIH25022. It demonstrates how Artificial Intelligence—specifically Constraint Programming—can drastically improve section throughput and reduce delays in railway networks compared to manual, First-Come-First-Served (FCFS) control.

The system models a realistic Indian Railways track topology consisting of 6 stations and 5 segments, including 2 critical single-line bottlenecks. It schedules a diverse roster of 14 trains (Rajdhani, Mail/Express, Passenger, and Freight) traveling in opposite directions, adhering to strict safety rules like exclusive track access, 5-minute headways, and station loop line capacities.

## The AI Approach: CP-SAT

To solve the scheduling problem, we use **Google OR-Tools CP-SAT (Constraint Programming - Boolean Satisfiability)**. 
CP-SAT is a state-of-the-art solver designed specifically for combinatorial optimization problems like scheduling. 

We model the physical railway network as a series of constraints:
* **Single-line safety:** Two trains cannot occupy a single-line segment at the same time (`AddNoOverlap`).
* **Headways:** A 5-minute minimum gap is enforced between consecutive trains entering a section.
* **Loop Capacity:** Cumulative constraints ensure that the number of trains waiting at a station never exceeds its physical loop line capacity (3 tracks).

The solver explores the mathematical space of all possible schedules to find the globally optimal sequence that minimizes **priority-weighted delay**. High-priority trains (like Vande Bharat/Rajdhani, weight 5) are prioritized for clear signals, while lower-priority trains (like Freight, weight 1) are strategically held back in loop lines.

### Why Constraint Programming over Reinforcement Learning (RL)?

While Deep Reinforcement Learning (RL) is a popular AI buzzword, Constraint Programming is the objectively superior choice for core railway scheduling:
1. **Safety Guarantees:** CP mathematically guarantees that physical constraints (like single-line exclusion) will *never* be violated. RL agents only learn statistical approximations of safety and can hallucinate dangerous moves.
2. **Explainability:** When CP delays a train, we can trace exactly which constraint caused the delay. RL decisions are opaque black boxes ("the neural net chose action 4"), which is unacceptable for human section controllers who must trust the system.
3. **No Training Required:** CP-SAT works out of the box on the mathematical model. RL requires massive amounts of historical data, simulators, and GPU compute to train, and often struggles to generalize to new track topologies.

## Results: AI vs Manual Control

We compare the CP-SAT AI against a First-Come-First-Served (FCFS) baseline, which mimics a human controller greedily clearing sections for whoever arrives first without looking ahead.

| Metric | Manual (FCFS) | AI (CP-SAT) | Improvement |
|--------|---------------|-------------|-------------|
| **Total Weighted Delay** | 2,885 | 2,139 | **-26%** |
| **Rajdhani Avg Delay** | 9.5 min | 1.0 min | **-89%** |
| **Freight Avg Delay** | 136.8 min | 187.0 min | +36% (Expected) |

By strategically delaying freight trains, the AI scheduler completely clears the congestion for high-priority express trains, resulting in massive overall system efficiency gains without requiring new physical track infrastructure.

## Setup & Run Instructions

This prototype is split into a Python FastAPI backend and a React (Vite) frontend.

### 1. Backend (Scheduling Engine)
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # (Windows)
pip install ortools fastapi uvicorn[standard]

# Run the CLI comparison
python main_cli.py

# Start the API server
uvicorn api.main:app --reload
```

### 2. Frontend (React Dashboard)
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` to view the interactive Gantt chart, live animated track diagram, and comparison dashboard.

## Future Work

1. **RL for Live Re-optimization:** While CP-SAT is perfect for creating the master daily schedule, a fast Reinforcement Learning agent or heuristic could be used for instant, sub-second micro-corrections when live GPS data indicates a train is running 2 minutes late.
2. **GPS / Data Logger Integration:** Integrate with real-time Indian Railways API (e.g., NTES/FOIS) to automatically seed the CP-SAT model with current train positions instead of static timetables.
3. **Multi-Section Scaling:** Expand the model to handle overlapping sections by using a rolling horizon approach, dividing the massive national network into tractable regional chunks that optimize their border handoffs.
