require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Meeting = require('./models/Meeting');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const File = require('./models/File');
const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing database collection records...');
    await User.deleteMany();
    await Meeting.deleteMany();
    await Message.deleteMany();
    await Notification.deleteMany();
    await File.deleteMany();

    console.log('Creating seed users...');
    // Create seed users
    const user1 = await User.create({
      fullName: 'Alex Carter',
      email: 'alex@example.com',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      role: 'admin',
    });

    const user2 = await User.create({
      fullName: 'Sarah Jenkins',
      email: 'sarah@example.com',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
      role: 'user',
    });

    const user3 = await User.create({
      fullName: 'Michael Chen',
      email: 'michael@example.com',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      role: 'user',
    });

    console.log('Creating sample meetings logs...');
    // Seed meeting logs
    const meeting1 = await Meeting.create({
      meetingId: 'prj-scrum-col',
      host: user1._id,
      participants: [user1._id, user2._id, user3._id],
      startTime: new Date(Date.now() - 3 * 3600000), // 3 hours ago
      endTime: new Date(Date.now() - 2.5 * 3600000), // 2.5 hours ago
    });

    const meeting2 = await Meeting.create({
      meetingId: 'des-sync-uiux',
      host: user2._id,
      participants: [user2._id, user3._id],
      startTime: new Date(Date.now() - 24 * 3600000), // 24 hours ago
      endTime: new Date(Date.now() - 23 * 3600000), // 23 hours ago
    });

    const meeting3 = await Meeting.create({
      meetingId: 'dev-demo-v1.0',
      host: user1._id,
      participants: [user1._id, user3._id],
      startTime: new Date(Date.now() + 5 * 3600000), // In 5 hours
    });

    console.log('Creating sample chat messages...');
    // Seed sample messages
    await Message.create([
      {
        sender: user1._id,
        meetingId: 'prj-scrum-col',
        message: 'Welcome everyone! Let\'s discuss the sprint roadmap.',
        timestamp: new Date(Date.now() - 3 * 3600000 + 1 * 60000),
      },
      {
        sender: user2._id,
        meetingId: 'prj-scrum-col',
        message: 'Perfect, I will present the UI design updates.',
        timestamp: new Date(Date.now() - 3 * 3600000 + 2 * 60000),
      },
      {
        sender: user3._id,
        meetingId: 'prj-scrum-col',
        message: 'And I will walk through the API integrations.',
        timestamp: new Date(Date.now() - 3 * 3600000 + 3 * 60000),
      },
    ]);

    console.log('Creating sample notifications...');
    // Seed sample notifications
    await Notification.create([
      {
        sender: user1._id,
        receiver: user2._id,
        type: 'invite',
        message: 'Alex Carter invited you to join: dev-demo-v1.0',
        isRead: false,
      },
      {
        sender: user3._id,
        receiver: user1._id,
        type: 'file',
        message: 'Michael Chen uploaded roadmap.pdf in prj-scrum-col',
        isRead: true,
      },
    ]);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding data: ${error.message}`);
    process.exit(1);
  }
};

seedData();
