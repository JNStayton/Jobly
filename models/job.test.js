'use strict';

const db = require('../db.js');
const { NotFoundError } = require('../expressError');
const Job = require('./job.js');
const { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll, testJobIds } = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe('create', () => {
	const newJob = {
		title: 'testing',
		salary: 123,
		equity: '0.1',
		companyHandle: 'c1'
	};
	test('adds job to DB and assigns id', async () => {
		const result = await Job.create(newJob);
		expect(result.id).toEqual(expect.any(Number));
		expect(result.title).toEqual('testing');
	});
});

describe('findAll', () => {
	test('works without filter params', async () => {
		const results = await Job.findAll();
		expect(results).toEqual([
			{
				id: testJobIds[0],
				title: 'J1',
				salary: 12345,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			},
			{
				id: testJobIds[1],
				title: 'J2',
				salary: 54321,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			},
			{
				id: testJobIds[2],
				title: 'J3',
				salary: 13579,
				equity: '0.0',
				companyHandle: 'c1',
				name: 'C1'
			}
		]);
	});
	test('works with title filter', async () => {
		let parameters = { title: 'J2' };
		const results = await Job.findAll(parameters);
		expect(results).toEqual([
			{
				id: testJobIds[1],
				title: 'J2',
				salary: 54321,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			}
		]);
	});
	test('works with salary filter', async () => {
		let parameters = { minSalary: 50000 };
		const results = await Job.findAll(parameters);
		expect(results).toEqual([
			{
				id: testJobIds[1],
				title: 'J2',
				salary: 54321,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			}
		]);
	});
	test('works with equity filter', async () => {
		let parameters = { hasEquity: true };
		const results = await Job.findAll(parameters);
		expect(results).toEqual([
			{
				id: testJobIds[0],
				title: 'J1',
				salary: 12345,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			},
			{
				id: testJobIds[1],
				title: 'J2',
				salary: 54321,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			}
		]);
	});
	test('works with multiple filters', async () => {
		let parameters = { hasEquity: true, title: '1' };
		const results = await Job.findAll(parameters);
		expect(results).toEqual([
			{
				id: testJobIds[0],
				title: 'J1',
				salary: 12345,
				equity: '0.1',
				companyHandle: 'c1',
				name: 'C1'
			}
		]);
	});
});

describe('get by id', () => {
	test('works', async () => {
		const result = await Job.get(testJobIds[0]);
		expect(result.id).toEqual(testJobIds[0]);
	});
	test('returns NotFound error if not found', async () => {
		try {
			await Job.get(328258);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

describe('update', () => {
	const updatedJob = {
		title: 'new title',
		salary: 100,
		equity: '0.0'
	};
	test('updates job with new data', async () => {
		const result = await Job.update(testJobIds[0], updatedJob);
		expect(result.title).toEqual('new title');
		expect(result.salary).toEqual(100);
		expect(result.equity).toEqual('0.0');
	});
	test('NotFoundError if invalid id', async () => {
		try {
			await Job.update(327542, updatedJob);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

describe('remove', () => {
	test('deletes job given correct id', async () => {
		await Job.remove(testJobIds[0]);
		const res = await db.query(`SELECT id FROM jobs WHERE id=${testJobIds[0]}`);
		expect(res.rows.length).toEqual(0);
	});
	test('NotFoundError if invalid id', async () => {
		try {
			await Job.remove(327542);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
