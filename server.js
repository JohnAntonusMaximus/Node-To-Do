var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');

var app = express();
var PORT = process.env.PORT || 3000;
var todos = [];
var todoNextId = 1;

app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.send('Todo API Root');
});

// GET /todos?completed=false&q=work
app.get('/todos', function(req, res) {
	var query = req.query;
	var where = {};

	if(query.hasOwnProperty('completed') && query.completed === 'true') {
		where.completed = true;
	} else if (query.hasOwnProperty('completed') && query.completed === 'false') {
		where.completed = false;
	}

	if(query.hasOwnProperty('q') && query.q.length > 0){
		where.description = {
		  $like:'%'+ query.q +'%'
		};
	}

	db.todo.findAll({where: where}).then(function(todo){
			res.status(200).json(todo).send();
		}, function(e){
		res.status(404).json(todo).send();
	});
});

// GET /todos/:id
app.get('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);

	db.todo.findById(todoId).then(function(todo){
		if(todo){
			res.status(200).json(todo).send();
		} else {
			res.status(400).json(todo).send();
		}
	}, function(e){
		 console.log("Oops! Something went wrong: ", e);
	 	});
});

// POST /todos
app.post('/todos', function(req, res) {
	var body = _.pick(req.body, 'description', 'completed');

	db.todo.create(body).then(function(todo){
		res.status(200).json(todo).send();
	}).catch(function(e){
		res.status(400).json(e).send();
	});

});

// DELETE /todos/:id
app.delete('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);
  db.todo.findById(todoId).then(function(todo){
		if(todo){
			todo.destroy().then(function(){
				res.status(200).json().send();
			});
		} else {
			res.status(404).send();
		}
	});
});

// PUT /todos/:id
app.put('/todos/:id', function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'description', 'completed');
	var attributes = {};

	if (body.hasOwnProperty('completed')) {
		attributes.completed = body.completed;
	}

	if (body.hasOwnProperty('description')) {
		attributes.description = body.description;
	}

	db.todo.findById(todoId).then(function(todo) {
		if (todo) {
			todo.update(attributes).then(function(todo) {
				res.json(todo.toJSON());
			}, function(e) {
				res.status(400).json(e);
			});
		} else {
			res.status(404).send();
		}
	}, function() {
		res.status(500).send();
	});
});

db.sequelize.sync().then(function(){
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});
