
exports.seed = async function(knex) {
	const defaultUser = await knex.raw('SELECT * FROM users WHERE user_name = ?', ['root']);
	if(!defaultUser.rows.length)
		await knex('users').insert({
			'user_name': 'root',
			'password': 'root',
			'name': 'Root'
		});
};
