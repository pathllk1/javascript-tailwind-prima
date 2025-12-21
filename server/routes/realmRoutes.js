const express = require('express');
const router = express.Router();
const { Task } = require('../database/realm');

// Get all tasks
router.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.getAll();
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, priority, tags } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const result = await Task.create({
      title,
      description,
      priority: priority || 0,
      tags: tags || []
    });

    if (result.success) {
      const tasks = await Task.getAll();
      return res.json({ success: true, data: tasks });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to create task' });
    }
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

// Update a task
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const result = await Task.update(id, updates);
    if (result.success) {
      const tasks = await Task.getAll();
      return res.json({ success: true, data: tasks });
    } else {
      return res.status(404).json({ success: false, error: 'Task not found or update failed' });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// Toggle task completion status
router.patch('/tasks/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Task.toggleComplete(id);
    
    if (result.success) {
      const tasks = await Task.getAll();
      return res.json({ success: true, data: tasks });
    } else {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error toggling task completion:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle task completion' });
  }
});

// Delete a task
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Task.delete(id);
    
    if (result.success) {
      const tasks = await Task.getAll();
      return res.json({ success: true, data: tasks });
    } else {
      return res.status(404).json({ success: false, error: 'Task not found or already deleted' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = router;
