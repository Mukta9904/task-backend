import Task from "../models/Task.js";

export const createTask = async (req, res) => {
  const { title, startTime, endTime, priority, status } = req.body;
  const transformedStartTime = new Date(
    startTime.year,
    startTime.month - 1,
    startTime.day,
    startTime.hour,
    startTime.minute,
    startTime.second,
    startTime.millisecond
  );

  const transformedEndTime = new Date(
    endTime.year,
    endTime.month - 1,
    endTime.day,
    endTime.hour,
    endTime.minute,
    endTime.second,
    endTime.millisecond
  );

  try {
    const task = await Task.create({
      title,
      startTime: transformedStartTime,
      endTime: transformedEndTime,
      priority,
      status,
      user: req.user?.id,
    });
    if(!task) {
      return res.status(400).json({ message: "Failed to create task" });
    }
    return res.status(201).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTasks = async (req, res) => {
  const { priority, status, sortBy, order } = req.query;

  try {
    const query = { user: req.user.id }; // Fetch tasks for the authenticated user

    // Validate and sanitize the priority filter
    if (priority) {
      const priorityNumber = parseInt(priority, 10);
      if (!isNaN(priorityNumber)) {
        query.priority = priorityNumber; // Use the sanitized number
      } else {
        console.log("Invalid priority value:", priority);
        
        return res.status(400).json({ message: "Invalid priority value." });
      }
    }

    // Validate the status filter
    if (status && !['pending', 'finished'].includes(status)) {
      console.log("Invalid status value:", status);
      
      return res.status(400).json({ message: "Invalid status value." });
    }
    if (status) query.status = status;

    // Sorting logic
    const sortOptions = {};
    if (sortBy) {
      const validSortFields = ['priority', 'startTime', 'endTime', 'status'];
      if (validSortFields.includes(sortBy)) {
        sortOptions[sortBy] = order === 'desc' ? -1 : 1;
      } else {
        console.log("Invalid sortBy field:", sortBy);
        return res.status(400).json({ message: "Invalid sortBy field." });
      }
    }

    const tasks = await Task.find(query).sort(sortOptions);
    if (!tasks) { return res.status(200).json([]); }
    return res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  } 
}

export const getAllTasks = async (req, res) => {
  try {
  const userId = req.user.id;
    const tasks = await Task.find({ user: userId }).sort({ createdAt: -1 });
    if (!tasks) {
      return res.status(404).json({ message: "No tasks found" });
    }
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
  
export const getStats = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id });
    if (!tasks) {
      return res.status(404).json({ message: "No tasks found" });
    }
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "finished"
    ).length;
    const pendingTasks = totalTasks - completedTasks;

    const averageCompletionTime =
      tasks
        .filter((task) => task.status === "finished")
        .reduce(
          (acc, task) =>
            acc + (new Date(task.endTime) - new Date(task.startTime)) / 3600000,
          0
        ) / completedTasks || 0;

    const pendingTasksDetails = tasks
      .filter((task) => task.status === "pending")
      .reduce(
        (acc, task) => {
          const currentTime = new Date();
          const timeElapsed =
            (currentTime - new Date(task.startTime)) / 3600000; 
          const remainingTime =
            (new Date(task.endTime) - currentTime) / 3600000; 

          acc.totalElapsedTime += timeElapsed > 0 ? timeElapsed : 0;
          acc.totalRemainingTime += remainingTime > 0 ? remainingTime : 0;
          return acc;
        },
        { totalElapsedTime: 0, totalRemainingTime: 0 }
      );

    res.status(200).json({
      totalTasks,
      completedPercentage: (completedTasks / totalTasks) * 100 || 0,
      pendingPercentage: (pendingTasks / totalTasks) * 100 || 0,
      averageCompletionTime,
      pendingTasks: {
        total: pendingTasks,
        totalElapsedTime: pendingTasksDetails.totalElapsedTime,
        totalRemainingTime: pendingTasksDetails.totalRemainingTime,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getPriorityStats = async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id });
        if (!tasks) {return res.status(404).json({ message: 'No tasks found' });}
        const priorities = [1, 2, 3, 4, 5];

        // Group tasks by priority
        const groupedByPriority = tasks.reduce((acc, task) => {
            if (task.status === 'pending') {
                const priority = task.priority; 
                const currentTime = new Date();
                const timeElapsed = (currentTime - new Date(task.startTime)) / 3600000; 
                const timeRemaining = (new Date(task.endTime) - currentTime) / 3600000; 
                
                if (!acc[priority]) {
                    acc[priority] = { pendingTasks: 0, timeLapsed: 0, timeToFinish: 0 };
                }

                acc[priority].pendingTasks += 1;
                acc[priority].timeLapsed += timeElapsed > 0 ? timeElapsed : 0;
                acc[priority].timeToFinish += timeRemaining > 0 ? timeRemaining : 0;
            }
            return acc;
        }, {});

        // Ensure all priority levels are present in the response
        const stats = priorities.map((priority) => ({
            priority: priority,
            pendingTasks: groupedByPriority[priority]?.pendingTasks || 0,
            timeLapsed: groupedByPriority[priority]?.timeLapsed || 0,
            timeToFinish: groupedByPriority[priority]?.timeToFinish || 0,
        }));

       return res.status(200).json({ stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, startTime, endTime, priority, status } = req.body;
  const transformedStartTime = new Date(
    startTime.year,
    startTime.month - 1,
    startTime.day,
    startTime.hour,
    startTime.minute,
    startTime.second,
    startTime.millisecond
  );

  const transformedEndTime = new Date(
    endTime.year,
    endTime.month - 1,
    endTime.day,
    endTime.hour,
    endTime.minute,
    endTime.second,
    endTime.millisecond
  );
  try {
    const task = await Task.findByIdAndUpdate(id, {
        $set: {title,
        startTime: transformedStartTime,
        endTime: transformedEndTime,
        priority,
        status,}
    },{ new: true});
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(task);
    } catch (error) {
    return res.status(500).json({ message: "Server error" });   
    }
};
