'use strict';

const request = require('supertest');

const db = require('../db');
const app = require('../app');

const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	u1Token,
	adminToken,
	testJobIds
} = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe('POST /jobs', () => {
	const newJob = {
		title: 'testJob',
		salary: 12345,
		equity: '0.1',
		companyHandle: 'c2'
	};
	test('ok for admin', async () => {
		const resp = await request(app).post('/jobs').send(newJob).set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			job: {
				id: expect.any(Number),
				title: 'testJob',
				salary: 12345,
				equity: '0.1',
				companyHandle: 'c2'
			}
		});
	});
	test('not ok for non admin', async () => {
		const resp = await request(app).post('/jobs').send(newJob).set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
	test('not okay for anon', async () => {
		const resp = await request(app).post('/jobs').send(newJob);
		expect(resp.statusCode).toEqual(401);
	});
	test('bad request for missing data', async () => {
		const resp = await request(app)
			.post('/jobs')
			.send({
				title: 'testJob',
				salary: 12345,
				equity: '0.1'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
	test('bad request for invalid data', async () => {
		const resp = await request(app)
			.post('/jobs')
			.send({
				name: 'testy'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

describe('GET /jobs', () => {
	test('okay for anon', async () => {
		const resp = await request(app).get('/jobs');
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			jobs: [
				{
					id: expect.any(Number),
					title: 'J1',
					salary: 1,
					equity: '0.1',
					companyHandle: 'c1',
					name: 'C1'
				},
				{
					id: expect.any(Number),
					title: 'J2',
					salary: 2,
					equity: '0.2',
					companyHandle: 'c1',
					name: 'C1'
				},
				{
					id: expect.any(Number),
					title: 'J3',
					salary: 3,
					equity: null,
					companyHandle: 'c1',
					name: 'C1'
				}
			]
		});
	});
	test('okay with one parameter', async () => {
		const resp = await request(app).get('/jobs').query({ title: 'J1' });
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			jobs: [
				{
					id: expect.any(Number),
					title: 'J1',
					salary: 1,
					equity: '0.1',
					companyHandle: 'c1',
					name: 'C1'
				}
			]
		});
	});
	test('okay with multiple parameters', async () => {
		const resp = await request(app).get('/jobs').query({ title: 'J', minSalary: 3, hasEquity: 'false' });
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			jobs: [
				{
					id: expect.any(Number),
					title: 'J3',
					salary: 3,
					equity: null,
					companyHandle: 'c1',
					name: 'C1'
				}
			]
		});
	});
	test('throws error with incorrect query', async () => {
		const resp = await request(app).get('/jobs').query({ maxSalary: 3 });
		expect(resp.statusCode).toEqual(400);
	});
	test('fails: test next() handler', async () => {
		// there's no normal failure event which will cause this route to fail ---
		// thus making it hard to test that the error-handler works with it. This
		// should cause an error, all right :)
		await db.query('DROP TABLE jobs CASCADE');
		const resp = await request(app).get('/jobs').set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(500);
	});
});

describe('GET /jobs/:id', () => {
	test('works for anon', async () => {
		const resp = await request(app).get(`/jobs/${testJobIds[0]}`);
		expect(resp.statusCode).toEqual(200);
		expect(resp.body).toEqual({
			job: {
				id: expect.any(Number),
				title: 'J1',
				salary: 1,
				equity: '0.1',
				companyHandle: {
					description: 'Desc1',
					handle: 'c1',
					logoUrl: 'http://c1.img',
					name: 'C1',
					numEmployees: 1
				}
			}
		});
	});
	test('not found for no such job', async () => {
		const resp = await request(app).get('/jobs/123456789');
		expect(resp.statusCode).toEqual(404);
	});
});

describe('PATCH /jobs/:id', () => {
	test('works for admin', async () => {
		const resp = await request(app)
			.patch(`/jobs/${testJobIds[0]}`)
			.send({
				title: 'J1-new'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({
			job: {
				id: expect.any(Number),
				title: 'J1-new',
				salary: 1,
				equity: '0.1',
				companyHandle: 'c1'
			}
		});
	});
	test('does not work for not admin', async () => {
		const resp = await request(app)
			.patch(`/jobs/${testJobIds[0]}`)
			.send({
				title: 'J1-new'
			})
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
	test('does not work for anon', async () => {
		const resp = await request(app).patch(`/jobs/${testJobIds[0]}`).send({
			title: 'J1-new'
		});
		expect(resp.statusCode).toEqual(401);
	});
	test('not found for no such job', async () => {
		const resp = await request(app)
			.patch(`/jobs/123456789`)
			.send({
				title: 'J1-new'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});
	test('bad request on id change attempt', async () => {
		const resp = await request(app)
			.patch(`/jobs/123456789`)
			.send({
				id: 666
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
	test('bad request on invalid data', async () => {
		const resp = await request(app)
			.patch(`/jobs/123456789`)
			.send({
				name: 'J1-new'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

describe('DELETE /jobs/:id', () => {
	test('works for admin', async () => {
		const resp = await request(app).delete(`/jobs/${testJobIds[0]}`).set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({ deleted: `${testJobIds[0]}` });
	});
	test('does not for for not admin', async () => {
		const resp = await request(app).delete(`/jobs/${testJobIds[0]}`).set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
	test('does not work for anon', async () => {
		const resp = await request(app).delete(`/jobs/${testJobIds[0]}`);
		expect(resp.statusCode).toEqual(401);
	});
	test('not found for no such job', async () => {
		const resp = await request(app).delete('/jobs/123456789').set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});
});
