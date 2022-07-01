const { sqlForPartialUpdate } = require('./sql');

describe('sqlForPartialUpdate', function() {
	test('returns sequelized data', () => {
		const dataToUpdate = { firstName: 'Jareth', lastName: 'The Cat' };
		const jsToSql = { firstName: 'first_name', lastName: 'last_name' };
		const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
		expect(result).toEqual({
			setCols: '"first_name"=$1, "last_name"=$2',
			values: [ 'Jareth', 'The Cat' ]
		});
	});
});
