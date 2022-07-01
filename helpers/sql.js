const { BadRequestError } = require('../expressError');

/**
 * builds a SQL query from 1) given values that match the schema and 2) an object that has the keys set as the JS column names and values as the SQL
 * If the data passed to it is bad, it throws an ExpressError
 * eg for good data: 
 * 
 * dataToUpdate = {"firstName": "Aliya", "age": 32} --> JS col: newValue
 * jsToSql = {"firstName": "first_name"} JS col --> SQL col
 * 
 * The fuction also increments the $1 parameterized value based on its index
 * It returns:
 * 
 * the SQL query of SET '"first-name"=$1, "last-name"=$2'
 * the VALUES ['Aliya', 32]
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
	const keys = Object.keys(dataToUpdate);
	if (keys.length === 0) throw new BadRequestError('No data');

	// {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
	const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

	return {
		setCols: cols.join(', '),
		values: Object.values(dataToUpdate)
	};
}

module.exports = { sqlForPartialUpdate };
