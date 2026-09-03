const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  const users = store.db.users;
  const orders = store.db.orders;

  const ranking = users.map(u => {
    const userOrders = orders.filter(o => o.createdBy === u.id || o.designerId === u.id || o.masterId === u.id);
    const revenueGenerated = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const ordersCount = userOrders.length;
    const score = ordersCount * 10 + Math.round(revenueGenerated / 100000);

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      color: u.color,
      ordersCount,
      revenueGenerated,
      score
    };
  }).sort((a, b) => b.score - a.score);

  res.json({
    leaderboard: ranking,
    honorBoard: store.db.honorBoard || []
  });
});

module.exports = router;
