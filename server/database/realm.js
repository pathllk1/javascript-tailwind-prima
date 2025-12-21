const Realm = require('realm');
const path = require('path');

// Define your models and their properties
const TaskSchema = {
  name: 'Task',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    title: 'string',
    description: 'string?',
    isComplete: { type: 'bool', default: false },
    createdAt: { type: 'date', default: () => new Date() },
    priority: { type: 'int', default: 0 },
    tags: 'string[]',
    userId: 'string?'
  }
};

const UserSchema = {
  name: 'User',
  primaryKey: '_id',
  properties: {
    _id: 'objectId',
    username: 'string',
    email: 'string',
    createdAt: { type: 'date', default: () => new Date() },
    tasks: { type: 'list', objectType: 'Task' }
  }
};

// Initialize a new Realm instance
const getRealm = async () => {
  try {
    const realm = await Realm.open({
      path: path.join(__dirname, '../../data/myrealm'),
      schema: [TaskSchema, UserSchema],
      schemaVersion: 1,
      // Uncomment the following line to enable encryption (recommended for production)
      // encryptionKey: new Int8Array(64) // Generate a secure key in production
    });
    console.log('Realm database opened successfully');
    return realm;
  } catch (error) {
    console.error('Failed to open Realm:', error);
    throw error;
  }
};

// Example CRUD operations for Tasks
const Task = {
  // Create a new task
  async create(taskData) {
    const realm = await getRealm();
    try {
      realm.write(() => {
        realm.create('Task', {
          _id: new Realm.BSON.ObjectId(),
          ...taskData,
          createdAt: new Date(),
        });
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error };
    }
  },

  // Get all tasks
  async getAll() {
    const realm = await getRealm();
    return realm.objects('Task').sorted('createdAt', true);
  },

  // Get a single task by ID
  async getById(id) {
    const realm = await getRealm();
    return realm.objectForPrimaryKey('Task', id);
  },

  // Update a task
  async update(id, updates) {
    const realm = await getRealm();
    try {
      realm.write(() => {
        const task = realm.objectForPrimaryKey('Task', id);
        if (task) {
          Object.assign(task, updates);
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating task:', error);
      return { success: false, error };
    }
  },

  // Delete a task
  async delete(id) {
    const realm = await getRealm();
    try {
      realm.write(() => {
        const task = realm.objectForPrimaryKey('Task', id);
        if (task) {
          realm.delete(task);
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { success: false, error };
    }
  },

  // Toggle task completion status
  async toggleComplete(id) {
    const realm = await getRealm();
    try {
      realm.write(() => {
        const task = realm.objectForPrimaryKey('Task', id);
        if (task) {
          task.isComplete = !task.isComplete;
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Error toggling task completion:', error);
      return { success: false, error };
    }
  }
};

module.exports = {
  getRealm,
  Task,
  schemas: {
    Task: TaskSchema,
    User: UserSchema
  }
};
