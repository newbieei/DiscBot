// Import necessary modules
require('dotenv').config();
const { Client, IntentsBitField, REST } = require('discord.js');
const mongoose = require('mongoose');

// Create a Discord client with specified intents
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// Define a mongoose schema for tasks
const taskSchema = new mongoose.Schema({
  manager: String,
  intern: String,
  description: String,
  deadline: String,
  status: String,
});

// Create a mongoose model for tasks
const Task = mongoose.model('Task', taskSchema);

// Event: Bot is ready
client.on('ready', () => {
  console.log(`✅ ${client.user.tag} is online.`);
});

// Event: Create Task command
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!createTask')) {
    const args = message.content.slice('!createTask'.length).trim().split(' ');
    const intern = message.mentions.members.first();
    const taskDescription = args.slice(1).join(' ');
    const deadline = args[args.length - 1];

    if (!intern || !taskDescription || !deadline) {
      message.channel.send('Invalid command usage. Please mention an intern, provide task description, and set a deadline.');
      return;
    }

    try {
      // Save task details in the database
      const task = new Task({
        manager: message.author.id,
        intern: intern.id,
        description: taskDescription,
        deadline: deadline,
        status: 'Pending',
      });

      const savedTask = await task.save();

      message.channel.send(`Task created successfully!\nTask ID: ${savedTask._id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      message.channel.send('An error occurred while creating the task. Please try again.');
    }
  }
});

// Event: Communicate command
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!communicate')) {
    const args = message.content.slice('!communicate'.length).trim().split(' ');
    const recipient = message.mentions.members.first();
    const messageContent = args.slice(1).join(' ');

    if (!recipient || !messageContent) {
      message.channel.send('Invalid command usage. Please mention a recipient and provide a message.');
      return;
    }

    try {
      // Send the communication message
      const communicationMessage = `**Communication from ${message.author.tag}:**\n${messageContent}`;
      await recipient.send(communicationMessage);

      message.channel.send('Your message has been sent.');
    } catch (error) {
      console.error('Error sending communication message:', error);
      message.channel.send('An error occurred while sending the message. Please try again.');
    }
  }
});

// Event: Update Task command
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!updateTask')) {
    const args = message.content.split(' ').slice(1);

    const taskId = args[0];
    const updatedStatus = args.slice(1).join(' ');

    if (!taskId || !updatedStatus) {
      message.channel.send('Invalid command usage. Please provide a task ID and an update status.');
      return;
    }

    try {
      const { ObjectId } = require('mongoose').Types;
      const validTaskId = new ObjectId(taskId);

      // Update task status in the database
      const filter = { _id: validTaskId, intern: message.author.id };
      const update = { status: updatedStatus };
      const options = { new: true }; // Return the modified document

      const updatedTask = await Task.findByIdAndUpdate(filter, update, options);

      if (!updatedTask) {
        message.channel.send('Task not found or you are not assigned to this task. Unable to update.');
        return;
      }

      message.channel.send(`Task ${validTaskId} updated successfully. New status: ${updatedStatus}`);
    } catch (error) {
      console.error('Error updating task:', error);
      message.channel.send('An error occurred while updating the task. Please try again.');
    }
  }
});

// Event: Task Tracking command
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!taskTracking')) {
    try {
      // Fetch all tasks assigned to the reporting manager
      const reportingManagerId = message.author.id;
      const tasks = await Task.find({ manager: reportingManagerId });

      if (tasks.length === 0) {
        message.channel.send('No tasks found for the reporting manager.');
        return;
      }

      // Display tasks with details
      let taskList = 'Tasks Assigned to You:\n';
      tasks.forEach((task) => {
        taskList += `Task ID: ${task._id}\nIntern: <@${task.intern}>\nDescription: ${task.description}\nDeadline: ${task.deadline}\nStatus: ${task.status}\n\n`;
      });

      message.channel.send(taskList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      message.channel.send('An error occurred while fetching tasks. Please try again.');
    }
  }
});


// Connect to MongoDB
(async () => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');
  } catch (error) {
    console.log(`Error: ${error}`);
  }
})();




// Log in to Discord using the bot token
client.login(process.env.TOKEN);
