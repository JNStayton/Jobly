'use strict';

const db = require('../db');
const { NotFoundError, BadRequestError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

class Job {
	/** Create a job (from data), update db, return new jo data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * */
	static async create(data) {
		let { title, salary, equity, companyHandle } = data;
		const result = await db.query(
			`INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS companyHandle`,
			[ title, salary, equity, companyHandle ]
		);
		const job = result.rows[0];
		return job;
	}

	/** Get all jobs.
   *
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * can filter by SALARY (minSalary=num), TITLE(title ILIKE ''), or EQUITY(hasEquity=true/false)
   * 
    */
	static async findAll(parameters = {}) {
		let mainQuery = `SELECT j.id, 
                                j.title, 
                                j.salary, 
                                j.equity, 
                                j.company_handle AS "companyHandle", 
                                c.name
                         FROM jobs AS j
                         JOIN companies AS c ON j.company_handle = c.handle`;
		//last section of query
		let endQuery = ` ORDER BY title`;
		//the WHERE clause of the query we'll insert between mainQuery and endQuery
		let whereQuery = [];
		//the parameterized values we'll include at the end of the SQL statement
		let queryValues = [];

		//destructure parameters given
		let { title, minSalary, hasEquity } = parameters;

		//if hasEquity is true, list only jobs with non-zero equity
		if (hasEquity === true) {
			whereQuery.push(`equity > 0`);
		}

		//if title,
		//add title to queryValues, add `title ILIKE $1 (length of queryValues)`
		if (title !== undefined) {
			queryValues.push(`%${title}%`);
			whereQuery.push(`title ILIKE $${queryValues.length}`);
		}

		//if minSalary,
		//add minSalary to queryValues, add `salary >= $2`
		if (minSalary !== undefined) {
			queryValues.push(minSalary);
			whereQuery.push(`salary >= $${queryValues.length}`);
		}

		let sqlQuery;
		//combine whereQuery with mainQuery and endQuery, join whereQuery on 'AND'
		if (whereQuery.length > 0) {
			sqlQuery = mainQuery + ' WHERE ' + whereQuery.join(' AND ') + endQuery;
		} else {
			sqlQuery = mainQuery + endQuery;
		}

		const jobsRes = await db.query(sqlQuery, queryValues);
		return jobsRes.rows;
	}

	//Get job by its id in the DB or throw an error if job does not exist
	static async get(id) {
		const jobRes = await db.query(
			`SELECT id, title, salary, equity, company_handle AS "companyHandle" FROM jobs WHERE id=$1`,
			[ id ]
		);
		const job = jobRes.rows[0];
		if (!job) {
			throw new NotFoundError(`That job does not exist: job id ${id}`);
		}

		//get company info for individual job based on handle
		const companyRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
			[ job.companyHandle ]
		);

		//delete the company_handle from job, and set the new one to be the result from companyRes
		delete job.companyHandle;
		job.companyHandle = companyRes.rows[0];

		return job;
	}

	/**
     * get partial update set and values from data,
     * write the query, 
     * return the updated results
     */
	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {});
		const idIdx = '$' + (values.length + 1);
		const query = `UPDATE jobs SET ${setCols} WHERE id=${idIdx} RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
		const results = await db.query(query, [ ...values, id ]);
		const job = results.rows[0];

		if (!job) {
			throw new NotFoundError(`That job does not exist: job id ${id}`);
		}
		return job;
	}

	/**
     * delete a job by its id or return an error if that id is not in the db
     */
	static async remove(id) {
		const result = await db.query(
			`DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id`,
			[ id ]
		);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`That job does not exist: job id ${id}`);
	}
}

module.exports = Job;
