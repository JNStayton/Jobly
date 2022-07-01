'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** Related functions for companies. */

class Company {
	/** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

	static async create({ handle, name, description, numEmployees, logoUrl }) {
		const duplicateCheck = await db.query(
			`SELECT handle
           FROM companies
           WHERE handle = $1`,
			[ handle ]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate company: ${handle}`);

		const result = await db.query(
			`INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
			[ handle, name, description, numEmployees, logoUrl ]
		);
		const company = result.rows[0];

		return company;
	}

	/** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * If optional parameters entered, can filter results by:
   * name, minEmployees, maxEmployees
   * if minEmployees is greater than maxEmployees, return 400 error with message
 */

	static async findAll(parameters = {}) {
		//initial query
		let mainQuery = `SELECT handle,
                            name,
                            description,
                            num_employees AS "numEmployees",
                            logo_url AS "logoUrl"
                      FROM companies`;
		//last section of query
		let endQuery = ` ORDER BY name`;
		//the WHERE clause of the query we'll insert between mainQuery and endQuery
		let whereQuery = [];
		//the parameterized values we'll include at the end of the SQL statement
		let queryValues = [];

		//destructure parameters given
		let { name, minEmployees, maxEmployees } = parameters;

		//if minEmployees > maxEmployees => throw new Error
		if (minEmployees > maxEmployees) {
			throw new BadRequestError('Minimum employees cannot exceed maximum employees', 400);
		}

		//if minEmployees,
		//add minEmployees to queryValues, add `num_employees >= $1 (length of queryValues)`
		if (minEmployees !== undefined) {
			queryValues.push(minEmployees);
			whereQuery.push(`num_employees >= $${queryValues.length}`);
		}

		//if maxEmployees,
		//add maxEmployees to queryValues, add `num_employees <= $2`
		if (maxEmployees !== undefined) {
			queryValues.push(maxEmployees);
			whereQuery.push(`num_employees <= $${queryValues.length}`);
		}

		//if name,
		//add name to queryValues, add `name ILIKE $3`
		//be sure to format the ILIKE query value with %
		if (name) {
			queryValues.push(`%${name}%`);
			whereQuery.push(`name ILIKE $${queryValues.length}`);
		}

		let sqlQuery;
		//combine whereQuery with mainQuery and endQuery, join whereQuery on 'AND'
		if (whereQuery.length > 0) {
			sqlQuery = mainQuery + ' WHERE ' + whereQuery.join(' AND ') + endQuery;
		} else {
			sqlQuery = mainQuery + endQuery;
		}

		const companiesRes = await db.query(sqlQuery, queryValues);
		return companiesRes.rows;
	}

	/** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

	static async get(handle) {
		const companyRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
			[ handle ]
		);

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return company;
	}

	/** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

	static async update(handle, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			numEmployees: 'num_employees',
			logoUrl: 'logo_url'
		});
		const handleVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
		const result = await db.query(querySql, [ ...values, handle ]);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return company;
	}

	/** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

	static async remove(handle) {
		const result = await db.query(
			`DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
			[ handle ]
		);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);
	}
}

module.exports = Company;
