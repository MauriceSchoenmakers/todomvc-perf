'use strict';

// --- FRONTEND EVENTS ---

var events = {
	frontend : function F(){
		
		var
			i,
			document_events = ('abort|beforeinput|blur|click|dblclick|'+
				'compositionstart|compositionupdate|compositionend|'+
				'error|'+
				'focus|focusin|focusout|'+
				'input|keydown|keyup|'+
				'load|unload|'+
				'mousedown|mouseenter|mouseleave|mousemove|mouseout|mouseover|mouseup|'+
				'resize|scroll|select|wheel|'+
				'touchstart|touchend|touchmove|touchcancel').split('|');
		
		var document_register = function( event_type ){
			var h = function(e){ var m = { properties : {}, event: e }; return F.handler(m); };
			document.documentElement.addEventListener(event_type, h, true);
			//document.documentElement.addEventListener(type, h, false);
		};
		
		i = document_events.length; while(i-->0) document_register(document_events[i]);
		
		var window_events='hashchange|load'.split('|');
		var window_register = function( event_type ){
			var h = function(e){
				e = e || {};
				if(!e.type) e.type = event_type;
				var m = { properties : {}, event: e }; 
				return F.handler(m);
			};
			var p = 'on'+event_type;
			var f = window[p];
			window[p] = function(e){ h(e); if(f) f.apply(this,arguments); };
		};
		
		i = window_events.length; while(i-->0) window_register(window_events[i]);
	}
};

events.frontend.log = (function(){
	var properties = {}; 'timeStamp|type|target|currentTarget|eventPhase|bubbles|cancelable'.split('|').forEach(function(n){properties[n]=true;});
	
	var log = document.getElementById('log-frontend');
	
	return log ? function(m){
		var
			e   = m.event,
			str = function(props,o){
				var s = '';
				if (props && o) for( var p in props ) if( p in o ){
					var v=o[p];
					s+= p + '=' + ( typeof(v) === 'object' && 'id' in v ? (v.id || v.tagName) : JSON.stringify(v) ) + '\t,';
				}
				return s;
			};
		
		var s = str(properties,e)+str(m.properties,m);
		
		log.insertBefore(document.createElement('br'), log.firstChild);
		log.insertBefore(document.createTextNode(s),   log.firstChild);
		
		return m;
	} : function(m){return m;};
})();

events.frontend.handler = function(m){ events.frontend.log(m); };
events.frontend();

// --- BACKEND EVENTS ---


events.backend = {
};

events.backend.log = function(prefix){
	var log = document.getElementById('log-backend');
	
	return log ? function(m){
		var s = prefix + JSON.stringify(m.operation);
		
		log.insertBefore(document.createElement('br'), log.firstChild);
		log.insertBefore(document.createTextNode(s),   log.firstChild);
		
		return m;
	} : function(m){return m;};
};

events.backend.output = {};
events.backend.output.log = events.backend.log('>');
events.backend.output.handler  = function(m){ events.backend.output.log(m); };

events.backend.input = {};
events.backend.input.log = events.backend.log('<');
events.backend.input.handler  = function(m){ events.backend.input.log(m); };
