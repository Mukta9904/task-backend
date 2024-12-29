import express from 'express';
import { createTask, getTasks, getStats, getPriorityStats, updateTask, getAllTasks, deleteTask } from '../controllers/taskController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createTask);
router.delete('/:id', deleteTask);
router.get('/all', getAllTasks);
router.get('/', getTasks);
router.get('/stats', getStats);
router.get('/priority-table', getPriorityStats);
router.put('/:id', updateTask);
export default router;