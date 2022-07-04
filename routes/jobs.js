'use strict';

/** Routes for companies. */

const jsonschema = require('jsonschema');
const express = require('express');

const { BadRequestError } = require('../expressError');
const { ensureLoggedIn, ensureAdminStatus } = require('../middleware/auth');
const Job = require('../models/job');

const jobNewSchema = require('../schemas/jobNew.json');
const jobUpdateSchema = require('../schemas/jobUpdate.json');
const jobSearchSchema = require('../schemas/jobSearch.json');

const router = new express.Router();

/**
 * POST => Job.create(data) new job, return job data
 * admin only
 */
router.post('/', ensureLoggedIn, ensureAdminStatus, async (req, res, next) => {
	try {
		//validate data against json schema
		const validator = jsonschema.validate(req.body, jobNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const job = await Job.create(req.body);
		return res.status(201).json({ job });
	} catch (e) {
		return next(e);
	}
});

/**
 * GET => Job.findAll(parameters)
 * anyone
 */
router.get('/', async (req, res, next) => {
	try {
		//set minSalary to Integer, set hasEquity to Boolean
		let query = req.query;
		if (query.minSalary !== undefined) {
			query.minSalary = parseInt(query.minSalary);
		}
		query.hasEquity === 'true' ? (query.hasEquity = true) : (query.hasEquity = false);
		//validate against json schema
		const validator = jsonschema.validate(query, jobSearchSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const jobs = await Job.findAll(query);
		return res.json({ jobs });
	} catch (e) {
		return next(e);
	}
});

/**
 * GET => Job.get(id)
 * anyone
 */
router.get('/:id', async (req, res, next) => {
	try {
		const job = await Job.get(req.params.id);
		res.json({ job });
	} catch (e) {
		return next(e);
	}
});

/**
 * PATCH => Job.update(data)
 * admin only
 */
router.patch('/:id', ensureLoggedIn, ensureAdminStatus, async (req, res, next) => {
	try {
		const validator = jsonschema.validate(req.body, jobUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		const job = await Job.update(req.params.id, req.body);
		res.json({ job });
	} catch (e) {
		return next(e);
	}
});

/**
 * DELETE => Job.remove(id)
 * admin only
 */
router.delete('/:id', ensureLoggedIn, ensureAdminStatus, async (req, res, next) => {
	try {
		await Job.remove(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (e) {
		return next(e);
	}
});

module.exports = router;
