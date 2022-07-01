'use strict';

/** Routes for companies. */

const jsonschema = require('jsonschema');
const express = require('express');

const { BadRequestError } = require('../expressError');
const { ensureLoggedIn, ensureAdminStatus } = require('../middleware/auth');
const Company = require('../models/company');

const companyNewSchema = require('../schemas/companyNew.json');
const companyUpdateSchema = require('../schemas/companyUpdate.json');
const companySearchSchema = require('../schemas/companySearch.json');
const { query } = require('express');

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login as Admin
 */

router.post('/', ensureLoggedIn, ensureAdminStatus, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, companyNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const company = await Company.create(req.body);
		return res.status(201).json({ company });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get('/', async function(req, res, next) {
	//get minEmployees and maxEmployees from req.body and parseInt
	let query = req.query;
	if (query.minEmployees !== undefined) {
		query.minEmployees = parseInt(query.minEmployees);
	}
	if (query.maxEmployees !== undefined) {
		query.maxEmployees = parseInt(query.maxEmployees);
	}

	//validate the query parameters with companySearchSchema
	try {
		const validator = jsonschema.validate(query, companySearchSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const companies = await Company.findAll(query);
		return res.json({ companies });
	} catch (err) {
		return next(err);
	}
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get('/:handle', async function(req, res, next) {
	try {
		const company = await Company.get(req.params.handle);
		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login as Admin
 */

router.patch('/:handle', ensureLoggedIn, ensureAdminStatus, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, companyUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const company = await Company.update(req.params.handle, req.body);
		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login as Admin
 */

router.delete('/:handle', ensureLoggedIn, ensureAdminStatus, async function(req, res, next) {
	try {
		await Company.remove(req.params.handle);
		return res.json({ deleted: req.params.handle });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
