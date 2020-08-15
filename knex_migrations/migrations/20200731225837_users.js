
exports.up = async function(knex) {
	let exists = await knex.schema.withSchema('public').hasTable('users');
	if(!exists)
		await knex.schema.withSchema('public').createTable('users', function(tbl) {
			tbl.uuid('id').notNullable().primary().defaultTo(knex.raw('uuid_generate_v4()'));
			tbl.text('user_name').notNullable();
			tbl.text('name').notNullable();
			tbl.text('password').notNullable();
			tbl.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
			tbl.unique(['user_name']);
		});
};

exports.down = async function(knex) {
	let exists = await knex.schema.withSchema('public').hasTable('users');
	if(exists)
		await knex.schema.withSchema('public').dropTable('users');
 
};
