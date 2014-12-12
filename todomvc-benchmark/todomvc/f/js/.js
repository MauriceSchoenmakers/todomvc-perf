
var storage = {
	select : {
		create : function(m){ var v=m.target; if(v && v.matches('#new-todo')) return m; }
	
	}
}



/*
var storage = {
	'/todos' : {
		
		post: function (body) {
			localStorage.setItem(id, JSON.stringify(body));
		},
		
			
			return JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
		},

		put: function (todos) {
			localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
		}
	};
};
*/
