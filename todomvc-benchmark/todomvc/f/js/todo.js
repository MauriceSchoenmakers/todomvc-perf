'use strict';

// DEBUGGER IDE SUPPORT
var debug = function(m){debugger;return m;};

var value2dom = function(v,el){
	     if (el.type === 'checkbox'){ el.checked   = !!v; }
	else if ('value'   in el       ){ el.value     = v;   }
	else                            { el.innerHTML = v;   }
};

// TEMPLATING ENGINE
var render = function(root,n,v,id){
	var els = root.querySelectorAll('[data='+n+']');
	for (var i = 0, l = els.length; i<l; ++i) {
		var el=els[i];
		if (id) el.setAttribute('data-id',id);
		
		if ('id'===n) continue;
		
		value2dom(v,el);
		
		if (id) el.setAttribute('data-id',id);
	}
};

// ID GENERATOR
var new_id = function F(){
	return (F.id = F.id ? ++F.id : 1 );
};

// APPLICATION BUILDING BLOCKS
var todo = {
	
	frontend : {
		
		select : function(selector){
			return  function(m){ var e = m.event, v = e ? e.target : null; if(v && v.matches &&v.matches(selector)){ m.element = v; return m;} };
		},
		
		character : {
			enter : function(m){ var e = m.event, v= (e.type==='keydown' ? e.key || e.keyCode : null); if( v && v===13 ) return m; },
			escape: function(m){ var e = m.event, v= (e.type==='keydown' ? e.key || e.keyCode : null); if( v && v===27 ) return m; }
		},
		
		type : function(type){
			return function(m){ var e = m.event; if( e && e.type === type ) return m; };
		},
		
		element: {
			value : {
				get   : function(m){
					if (!m.element) return m;
					var el = m.element; m.value = (el.type === 'checkbox' ? el.checked : el.value);
					return m;
				},
				trim  : function(m){ var v = m.value; if (v) m.value = v.replace(/^\s+/,'').replace(/\s+$/,''); return m; },
				reset : function(m){ var el = m.element; if (el) el.value = ''; return m; },
				set   : function(element,prop){
					var set_value=function(v){ return function(el){ value2dom(v,el); }; };
					return function(m){
						if(!m[element] || !(prop in m) ) return m;
						var el=m[element],f=set_value(m[prop]);
						if(el.item) Array.prototype.forEach.call(el,f); else f(el);
						return m;
					};
				}
			},
			
			data_id : {
				get      : function(m){ var v = m.element ? m.element.getAttribute('data-id') : null; if(v) { m.id = v; return m; } }
			},
			
			toggle : function(element,prop,name,inverse){
				var toggle_element = function(set){
					return function(el){
						var cl=(el.getAttribute('class')||'').split(/\s+/), i=cl.indexOf(name);
						     if ( set && !~i) el.setAttribute('class', cl.concat(name).join(' '));
						else if (!set &&  ~i) el.setAttribute('class', (cl.splice(i,1),cl).join(' '));
					};
				};
				return function(m){
					if(!m[element] || (!(prop in m) && prop!==true && prop!==false)) return m;
					var set = typeof(prop)==='string'? m[prop] : prop;
					set = inverse ? !set  : !!set;
					var f = toggle_element(set), el=m[element];
					if(el.item) Array.prototype.forEach.call(el,f); else f(el);
					return m;
				};
			},
			
			remove: function(element){
				var f=function(el){ el.remove(); };
				return function(m){
					if(!m[element]) return m;
					var el=m[element];
					if(el.item) Array.prototype.forEach.call(el,f); else f(el);
					return m;
				};
			},
			
			focus:function(element){
				return function(m){
					if(!m[element]) return m;
					m[element].focus();
					return m;
				};
			},
			
			find: function(context,selector,element,all){
				element = element || 'element';
				var query = all ? 'querySelectorAll' : 'querySelector';
				return function(m){
					var c = typeof(context) ==='string' ? m[context] : context;
					if(!c[query]) return m;
					m[element] = c[query](selector);
					return m;
				};
			}
		},
		
		list : function(m){ m.list = document.querySelector('#todo-list'); if(m.list) return m; },
		
		item : {
			select : {
				editing : function(m){ if(m.item && m.item.matches && m.item.matches('.editing')) return m;}
			},
			
			find : {
				id:        function(m){ if(!m.id) return m; m.item = document.querySelector('#todo-list li[data-id="'+m.id+'"]'); return m; },
				completed: function(m){ m.items = document.querySelectorAll('#todo-list li.completed'      ); return m; },
				active:    function(m){ m.items = document.querySelectorAll('#todo-list li:not(.completed)'); return m; },
				all:       function(m){ m.items = document.querySelectorAll('#todo-list li'                ); return m; },
			},
			
			template : {
				create: function(m){
					var t = document.querySelector('#item-template'), content = t ? t.content : null;
					m.item =  content ? content.cloneNode(true) : null;
					if(m.item) return m; },
				
				render: function(m){ // title from body to template
					var root = m.item;
					if (!root) return m;
					var op = m.operation, body = op ? op.body : null, id = body ? body.id : null;
					if (!body) return m;
					for (var p in body) render(root, p, body[p], id);
					return m;
				}
			},
			add : function(m){ if( m.list && m.item) m.list.appendChild(m.item); return m; }
		},
		
		footer : {
			render : function(m){
				var root = m.footer;
				if (!root) return m;
				var data = m.data;
				if (!data) return m;
				for (var p in data) render(root, p, data[p]);
				return m;
			}
		}
	},
	
	backend : {
		
		list: {
			count: 0,
			completed: 0
		},
		
		select : {
			
			url : function(u,map){
				return (typeof(u)==='string' ?
					function(m){ var v=m.operation ? m.operation.url : null; if(v && v.substring(0,u.length)===u) return m; } :
					function(m){
						var v = m.operation ? m.operation.url : null, match = v ? u.exec(v) : null;
						if(!match) return;
						if(!map) return m;
						for(var i=1,l=match.lenght;i<l;++i){
							var g=match[i];
							if(g) m[i-1]=g;
						}
						return m;
					});
			},
			
			post  : function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'post'  ) return m; },
			get   : function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'get'   ) return m; },
			put   : function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'put'   ) return m; },
			delete: function(m){ var v=m.operation ? m.operation.method : null; if(v && v === 'delete') return m; }
		},
		
		operation: {
			
			post: function(m){
				if (!m.value) return m;
				m.operation = { method: 'post', url: '/todos', body: { title: m.value, completed:false } };
				m.properties.operation=true;
				return m;
			},
			
			add_id: function F(m){
				if (!m.operation) return m;
				var op = m.operation, body = op ? op.body : null, id = body ? body.id : void 0;
				if (id === void 0) body.id = new_id();
				return m;
			},
			
			completed: function(m){
				var op = m.operation, body = op ? op.body : null, completed = body ? body.completed : void 0;
				if (completed !== void 0) m.completed = completed;
				return m;
			},
			
			put: {
				completed: function(m){
					if(!m.id || !('value' in m) ) return m;
					m.operation = { method: 'put', url: '/todos/'+encodeURI(m.id)+'/completed', body: { id: m.id, completed: m.value } };
					m.properties.operation=true;
					return m;
				},
				
				all_completed: function(m){
					if( !('value' in m) ) return m;
					m.operation = { method: 'put', url: '/todos/completed', body: { completed: m.value } };
					m.properties.operation=true;
					return m;
				},
				
				title: function(m){
					if(!m.id || !('value' in m) ) return m;
					m.operation = { method: 'put', url: '/todos/'+encodeURI(m.id)+'/title', body: { id: m.id, title: m.value } };
					m.properties.operation=true;
					return m;
				},
				
				filter: function(m){
					m.operation = { method: 'put', url: '/todos', body : { filter: m.filter } };
					m.properties.operation=true;
					return m;
				}
			},
			
			delete: function(m){
				if (!m.id) return m;
				m.operation = { method: 'delete', url: '/todos/'+encodeURI(m.id) };
				m.properties.operation=true;
				return m;
			},
			
			delete_completed: function(m){
				m.operation = { method: 'delete', url: '/todos/completed' };
				m.properties.operation=true;
				return m;
			}
		}
	}
};

todo.backend.list.data = function(m){
	m.data = {};
	m.data.count           = todo.backend.list.count;
	m.data.completed       = todo.backend.list.completed;
	m.data.active          = m.data.count - m.data.completed;
	m.data['active-plural']= m.data.active === 1 ? '':'s';
	return m;
};


todo.frontend.filter = {
	value : '',
	inject : function(m){
		m.filter = todo.frontend.filter.value;
		return m;
	},
	extract : function(m){
		if(todo.frontend.filter.value !== m.filter){
			todo.frontend.filter.value = m.filter;
			return m;
		}
	},
	select : {
		all       : function(m){ if(m.filter===''         ) return m; },
		active    : function(m){ if(m.filter==='active'   ) return m; },
		completed : function(m){ if(m.filter==='completed') return m; }
	},
	
	find : function(m){ m.element = document.querySelector('#filters li a[href="#/'+m.filter+'"]'); return m; }
};

location.href = location.pathname+'#/'+todo.frontend.filter.value;

// FRAMEWORK
var pipeline = {
	
	and : function (pipeline){
		return function(m){
			for(var i=0,l=pipeline.length;i<l;i++){
				var f=pipeline[i];
				m=f(m);
				if(m === void 0) return ;
			}
			return m;
		};
	},
	
	or : function (pipeline){
		return function(m){
			for(var i=0,l=pipeline.length;i<l;i++){
				var f=pipeline[i];
				var r=f(m);
				if(r !== void 0) return r;
			}
			return;
		};
	}
};

var ui = todo.frontend;
var db = todo.backend;

// APPLICATION LOGIC

// REACTING ON USER INPUT
ui.pipeline = {
	
	create : pipeline.and([
		ui.select('#new-todo'),
		ui.character.enter,
		ui.element.value.get,
		ui.element.value.trim,
		db.operation.post,
		ui.element.value.reset,
		events.frontend.log
	]),
	
	completed : pipeline.and([
		ui.type('click'),
		ui.select('.toggle'),
		ui.element.value.get,
		ui.element.data_id.get,
		db.operation.put.completed,
		events.frontend.log
	]),
	
	all_completed : pipeline.and([
		ui.type('click'),
		ui.select('#toggle-all'),
		ui.element.value.get,
		db.operation.put.all_completed,
		events.frontend.log
	]),
	
	destroy : pipeline.and([
		ui.type('click'),
		ui.select('.destroy'),
		ui.element.data_id.get,
		db.operation.delete,
		events.frontend.log
	]),

	destroy_completed : pipeline.and([
		ui.type('click'),
		ui.select('#clear-completed'),
		db.operation.delete_completed,
		events.frontend.log
	]),
	
	edit : {
		begin : pipeline.and([
			ui.select('label'),
			ui.type('dblclick'),
			ui.element.data_id.get,
			ui.item.find.id,
			ui.element.toggle('item',true,'editing'),
			ui.element.find('item','.edit','input'),
			ui.element.focus('input'),
			function(m){ if(!m.input || !m.input.value ) return m; m.input.__value = m.input.value; return m; },
			events.frontend.log
		]),
		
		commit : pipeline.and([
			ui.select('.edit'),
			pipeline.or([
				ui.character.enter,
				ui.type('blur')
			]),
			ui.element.data_id.get,
			ui.item.find.id,
			ui.item.select.editing,
			ui.element.toggle('item',false,'editing'),
			ui.element.value.get,
			ui.element.value.trim,
			pipeline.or([
				pipeline.and([
					function(m){if(m.value) return m;},
					db.operation.put.title
				]),
				db.operation.delete
			]),
			events.frontend.log
		]),
		
		abort: pipeline.and([
			ui.select('.edit'),
			ui.character.escape,
			ui.element.data_id.get,
			ui.item.find.id,
			ui.element.toggle('item',false,'editing'),
			ui.element.find('item','.edit','input'),
			function(m){ if(!m.input || !m.input.__value) return m; m.input.value = m.input.__value; return m; },
			events.frontend.log
		])
	},
	
	filter: pipeline.and([
		ui.type('hashchange'),
		function(m){ if(location.hash) m.filter = location.hash.substring(2); return m; },
		ui.filter.extract,
		db.operation.put.filter,
	])
};

// REACTING ON BACKEND INPUT
db.pipeline = {
	// if we get a post for the collection we get the item template, render it, add it to the list and finally we log the executed operation
	create : pipeline.and([
		db.select.post,
		db.select.url(/\/todos\/?$/),
		db.operation.add_id,
		ui.list,
		ui.item.template.create,
		ui.item.template.render,
		ui.item.add,
		function(m){ m.count=++db.list.count; return m;},
		events.backend.input.log
	]),
	
	completed: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/([^\/]+)\/completed$/,['id']),
		ui.item.find.id,
		db.operation.completed,
		ui.element.toggle('item','completed','completed'),
		
		function(m){ m.value = m.completed ? ++db.list.completed : --db.list.completed ; return m;}, // total completed
		ui.element.find(document,'#clear-completed','clear'),
		ui.element.toggle('clear','value','hidden',true),
		
		function(m){ m['completed-all'] = db.list.completed===db.list.count  ; return m;},
		ui.element.find(document,'#toggle-all','toggle-all'),
		ui.element.value.set('toggle-all','completed-all'),

		events.backend.input.log
	]),
	
	all_completed: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/completed$/),
		db.operation.completed,
		ui.element.find(document,'#todo-list .toggle','toggles',true),
		ui.element.value.set('toggles','completed'),
		ui.item.find.all,
		ui.element.toggle('items','completed','completed'),
		
		function(m){ m.value = m.completed ? (db.list.completed=db.list.count) : (db.list.completed=0) ; return m;}, // total completed
		ui.element.find(document,'#clear-completed','clear'),
		ui.element.toggle('clear','value','hidden',true),
		
		events.backend.input.log
	]),
	
	title: pipeline.and([
		db.select.put,
		db.select.url(/\/todos\/([^\/]+)\/title$/,['id']),
		ui.item.find.id,
		ui.item.template.render,
		events.backend.input.log
	]),
	
	delete_completed: pipeline.and([
		db.select.delete,
		db.select.url(/\/todos\/completed$/),
		ui.item.find.completed,
		ui.element.remove('items'),
		function(m){ m.count = db.list.count-db.list.completed; return m;},
		
		function(m){ m.value = db.list.completed=0; return m;},
		ui.element.find(document,'#clear-completed','clear'),
		ui.element.toggle('clear','value','hidden',true),
		
		events.backend.input.log
	]),
	
	delete: pipeline.and([
		db.select.delete,
		db.select.url(/\/todos\/([^\/]+)$/,['id']),
		ui.item.find.id,
		
		ui.element.find('item','input.toggle','toggle'),
		function(m){ if(m.toggle && m.toggle.checked) m.value = --db.list.completed; return m;}, // total completed
		ui.element.find(document,'#clear-completed','clear'),
		ui.element.toggle('clear','value','hidden',true),
		
		ui.element.remove('item'),
		
		function(m){ m.count=--db.list.count; return m;},
		events.backend.input.log
	]),
	
	list : pipeline.or([
		pipeline.and([
			ui.element.find(document,'#footer','footer'),
			ui.element.toggle('footer','count','hidden',true),
			ui.element.find(document,'#main','main'),
			ui.element.toggle('main','count','hidden',true),
			
			db.list.data,
			ui.element.find(document,'#footer','footer'),
			ui.footer.render,
			
			events.backend.input.log,
		]),
		function(m){ return m;} // always continue
	]),
	
	filter : {
		set: pipeline.and([
			db.select.put,
			db.select.url(/\/todos$/),
			function(m){ m.filter = m.operation.body.filter; return m; },
			
			// adapt filter ui
			ui.element.find(document,'#filters .selected','filter-previous-selected',true),
			ui.element.toggle('filter-previous-selected',false,'selected'),
			ui.filter.find,
			ui.element.toggle('element',true,'selected'),
			events.backend.input.log,
		]),
		
		apply : pipeline.or([
			pipeline.and([
				ui.filter.select.all,
				ui.item.find.all,
				ui.element.toggle('items',false,'hidden'),
			]),
			pipeline.and([
				ui.filter.select.completed,
				ui.item.find.active,
				ui.element.toggle('items',true,'hidden'),
				ui.item.find.completed,
				ui.element.toggle('items',false,'hidden'),
			]),
			pipeline.and([
				ui.filter.select.active,
				ui.item.find.active,
				ui.element.toggle('items',false,'hidden'),
				ui.item.find.completed,
				ui.element.toggle('items',true,'hidden')
			]),
			function(m){ return m;} // always continue
		])
	}
};

var action    = ui.pipeline;
var operation = db.pipeline;


// BACKEND
events.backend.input.handler = pipeline.and([
	ui.filter.inject,
	pipeline.or([
		operation.create,
		operation.completed,
		operation.all_completed,
		operation.title,
		operation.delete_completed,
		operation.delete,
		operation.filter.set
	]),
	operation.list,
	operation.filter.apply
]);


// zero backend output <- input
//events.backend.output.handler = function(m){ setTimeout(function(){ events.backend.input.handler(m); },0); };
events.backend.output.handler = events.backend.input.handler;

// UI
events.frontend.handler = pipeline.and([
	ui.filter.inject,
	pipeline.or([
		action.create,
		action.completed,
		action.all_completed,
		action.destroy,
		action.destroy_completed,
		action.edit.begin,
		action.edit.commit,
		action.edit.abort,
		action.filter
	]),
	events.backend.output.log,
	events.backend.output.handler
]);
