var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var _ = require('underscore');
var db = require('./db.js');
var middleware = require('./middleware.js')(db);

var app = express();
var PORT = process.env.PORT || 3000;
var todos = [];
var todoNextId = 1;

app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.send('Todo API Root');
});

// GET /todos?completed=false&q=work
app.get('/todos', middleware.requireAuthentication, function(req, res) {
	var query = req.query;
	var where = {userId: req.user.get('id')};

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
app.get('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var where = {userId: req.user.get('id'), id: todoId};

	db.todo.findOne({where: where}).then(function(todo){
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
app.post('/todos', middleware.requireAuthentication, function(req, res) {
	var body = _.pick(req.body, 'description', 'completed');

	db.todo.create(body).then(function(todo){
		
		req.user.addTodo(todo).then(function(){
			return todo.reload();
		}).then(function(todo){
			res.status(200).json(todo).send();
		});
	}).catch(function(e){
		res.status(400).json(e).send();
	});

});

// DELETE /todos/:id
app.delete('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var where = {userId: req.user.get('id'), id: todoId};
  db.todo.findOne({where: where}).then(function(todo){
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
app.put('/todos/:id', middleware.requireAuthentication, function(req, res) {
	var todoId = parseInt(req.params.id, 10);
	var body = _.pick(req.body, 'description', 'completed');
	var attributes = {};
	var where = {userId: req.user.get('id'), id: todoId};

	if (body.hasOwnProperty('completed')) {
		attributes.completed = body.completed;
	}

	if (body.hasOwnProperty('description')) {
		attributes.description = body.description;
	}

	db.todo.findOne({where: where}).then(function(todo) {
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

app.post('/users', function(req,res){
	var body = _.pick(req.body, 'email', 'password');

	db.user.create(body).then(function(user){
			res.json(user.toPublicJSON());
	}, function(e){
		res.status(400).json(e);
	});
});

app.post('/users/login', function(req,res){
	var body = _.pick(req.body,'email','password');
	
	db.user.authenticate(body).then(function(user){
		var token = user.generateToken('authentication');
		if (token){
			res.header('Auth',token).json(user.toPublicJSON());
		} else{
			res.status(401).send();
		}
	},function(){
		res.status(401).send();
	});

});

db.sequelize.sync({force:true}).then(function(){
	app.listen(PORT, function() {
		console.log('Express listening on port ' + PORT + '!');
	});
});
