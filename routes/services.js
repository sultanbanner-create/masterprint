const express = require('express');
const router = express.Router();
const store = require('../data/store');

// Get all quick services with their recipes
router.get('/', (req, res) => {
  try {
    const services = store.db.quickServices || [];
    res.json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create new service with multi-ingredient recipe
router.post('/', (req, res) => {
  try {
    const { title, category, price, unit, icon, recipe } = req.body;
    if (!title || price === undefined) {
      return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    const cleanRecipe = Array.isArray(recipe) ? recipe.filter(r => r.materialId && Number(r.qty) > 0) : [];

    const newService = {
      id: 'qs_' + Date.now(),
      title: title.trim(),
      category: category || 'xerox',
      price: Math.max(0, Number(price) || 0),
      unit: unit || 'шт.',
      icon: icon || 'content_copy',
      recipe: cleanRecipe
    };

    if (!store.db.quickServices) store.db.quickServices = [];
    store.db.quickServices.push(newService);
    store.save();

    res.json({ success: true, service: newService });
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ error: 'Failed to create service: ' + err.message });
  }
});

// Update service (title, price, unit, category, icon, recipe)
router.put('/:id', (req, res) => {
  try {
    const service = (store.db.quickServices || []).find(s => s.id === req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    const { title, category, price, unit, icon, recipe } = req.body;

    if (title !== undefined) service.title = title.trim();
    if (category !== undefined) service.category = category;
    if (price !== undefined) service.price = Math.max(0, Number(price) || 0);
    if (unit !== undefined) service.unit = unit;
    if (icon !== undefined) service.icon = icon;
    if (recipe !== undefined) {
      service.recipe = Array.isArray(recipe) ? recipe.filter(r => r.materialId && Number(r.qty) > 0) : [];
    }

    store.save();
    res.json({ success: true, service });
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Failed to update service: ' + err.message });
  }
});

// Delete service
router.delete('/:id', (req, res) => {
  try {
    const index = (store.db.quickServices || []).findIndex(s => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    const deleted = store.db.quickServices.splice(index, 1)[0];
    store.save();

    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Failed to delete service: ' + err.message });
  }
});

module.exports = router;
