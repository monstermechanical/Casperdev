const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all users (for connection discovery)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const currentUserId = req.user.userId;

    const searchQuery = search ? {
      $and: [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { 'profile.firstName': { $regex: search, $options: 'i' } },
            { 'profile.lastName': { $regex: search, $options: 'i' } }
          ]
        }
      ]
    } : { _id: { $ne: currentUserId } };

    const users = await User.find(searchQuery)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user profile
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password')
      .populate('connections.userId', 'username profile.firstName profile.lastName profile.avatar');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('User profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Send connection request
router.post('/:userId/connect', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.userId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ error: 'Cannot connect to yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if connection already exists
    const existingConnection = currentUser.connections.find(
      conn => conn.userId.toString() === targetUserId
    );

    if (existingConnection) {
      return res.status(400).json({ 
        error: 'Connection already exists',
        status: existingConnection.status 
      });
    }

    // Add connection to both users
    currentUser.connections.push({
      userId: targetUserId,
      status: 'pending'
    });

    targetUser.connections.push({
      userId: currentUserId,
      status: 'pending'
    });

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      message: 'Connection request sent successfully',
      connection: {
        userId: targetUserId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Connection request error:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// Accept/reject connection request
router.put('/:userId/connection', auth, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.userId;
    const { status } = req.body; // 'accepted' or 'blocked'

    if (!['accepted', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update connection status for both users
    const currentUserConnection = currentUser.connections.find(
      conn => conn.userId.toString() === targetUserId
    );
    const targetUserConnection = targetUser.connections.find(
      conn => conn.userId.toString() === currentUserId
    );

    if (!currentUserConnection || !targetUserConnection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    currentUserConnection.status = status;
    targetUserConnection.status = status;

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      message: `Connection ${status} successfully`,
      connection: currentUserConnection
    });
  } catch (error) {
    console.error('Connection update error:', error);
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// Get user's connections
router.get('/:userId/connections', auth, async (req, res) => {
  try {
    const { status = 'accepted' } = req.query;
    
    const user = await User.findById(req.params.userId)
      .populate({
        path: 'connections.userId',
        select: 'username email profile.firstName profile.lastName profile.avatar isActive lastLogin'
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const connections = user.connections
      .filter(conn => conn.status === status)
      .map(conn => ({
        ...conn.userId._doc,
        connectionStatus: conn.status,
        connectedAt: conn.connectedAt
      }));

    res.json({ 
      connections,
      count: connections.length 
    });
  } catch (error) {
    console.error('Connections fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.username;
    delete updates.connections;
    delete updates.isActive;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;