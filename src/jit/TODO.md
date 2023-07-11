# JIT Batcher

## Checklist
- [ ] Basic structure
  - [ ] Figuring out how to launch a batch
  - [ ] Figuring out how to prep
  - [ ] Figuring out how to queue up batches
- [ ] Basic calculations
  - [ ] Batch timings
  - [ ] Batch thread counts
  - [ ] Estimated yield
- [ ] Basic monitoring
  - [ ] Basic data
  - [ ] View of batches
- [ ] Target benchmarking
  - [ ] Benchmark single server
  - [ ] Compare all benchmarked servers
  

## Idea
The Batcher will check how much ram is available on all of the servers it is allowed to use and check how if a batch can fit in.
When creating a batch, the batcher will add all of the tasks for this batch to its queue. <br/>
Then it will go through its queue and launch all tasks that are due.
It will continue checking any reports that might have come back on its port.
To process these reports, it sends them to a seperate script. <br/>
In the end it checks if the server it is currently targetting is still the best and change the target accordingly.

### Benefits
- Not storing the launched batches simplifies things a ton.
- Seperating the Batcher from the Monitoring might save a few milliseconds and allows for reusability of both systems.
- Switching targets while the Batcher is running saves me the hassle of re-launching the script.

### Problems
- Not storing the launched batches might make Monitoring or Aborting batches hard/impossible?

## Points of concern
- **Queueing up Batches** <br/> How? Do I need to store the launched batches? Do I store the entire batch or single tasks?
- **Data formatting** <br/> How do I handle my data for batches? Can I store them for debugging?
- **Visuallising the Batches** <br/> What library? I probably need a consistant format for my batches first
