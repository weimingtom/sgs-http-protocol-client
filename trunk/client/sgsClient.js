/*
	Copyright (c) 2010, Christiaan Verbree
	All rights reserved.

	Redistribution and use in source and binary forms, 
	with or without modification, are permitted provided 
	that the following conditions are met:

	- Redistributions of source code must retain the above 
	copyright notice, this list of conditions and the following disclaimer.
	- Redistributions in binary form must reproduce the above 
	copyright notice, this list of conditions and the following 
	disclaimer in the documentation and/or other materials 
	provided with the distribution.
	- Neither the name of its contributors may be used to endorse 
	or promote  products derived from this software without 
	specific prior written permission.
	
	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND 
	CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, 
	INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF 
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
	ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR 
	CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, 
	BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
	SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
	INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, 
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
	NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF 
	THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */

var sgsNetwork = {
	serverUrl : "/",
	
	/**
	* Callback object which informs about events from the server
	* Needs following functions:
	* - login(sessionId, username)
	* - logout()
	* - loginFailure(reason)
	* - sessionMessage(msg)
	* - channelMessage(channelId, msg)
	* - channelJoined(channelId, channelName)
	* - channelLeft(channelId)
	* - error(errorMsg)
	*
	* if any of this functions is left null then the event will be ignored.
	*/
	callbackObject : null,
	
	/**
	* The key of the current session. If null we don't have a valid session.
	*/
	session : null,
	
	/**
	* The username of which belongs to the current session.
	*/
	username : null,
	
	nextRequest : false,
	
	login : function(user, pass) {
		if(this.session != null) {
			if(this.callbackObject !== null && this.callbackObject.error !== null) {
				this.callbackObject.error('You are allready authentificated to the server');
			}
			return;
		}
		
		this._request(this.OP.LOGIN_REQUEST, [{key : 'Sgs-User', value : user}, {key : 'Sgs-Pass', value : pass}]);
		this.username = user;
	},
	
	logout : function() {
		if(this.session == null) {
			if(this.callbackObject !== null && this.callbackObject.error !== null) {
				this.callbackObject.error('Not logged in!');
			}
			return;
		}
		
		this._request(this.OP.LOGOUT_REQUEST, null, false);
		this.session = null;
	},
	
	sendSessionMessage : function(data) {
		if(this.session == null) {
			if(this.callbackObject !== null && this.callbackObject.error !== null) {
				this.callbackObject.error('Not logged in!');
			}
			return;
		}
		
		this._request(this.OP.SESSION_MESSAGE, [{key : 'Sgs-Data', value : this.base64_encode(data)}]);
	},
	
	sendChannelMessage : function(channelId, data) {
		if(this.session == null) {
			if(this.callbackObject !== null && this.callbackObject.error !== null) {
				this.callbackObject.error('Not logged in!');
			}
			return;
		}
		
		this._request(this.OP.CHANNEL_MESSAGE, [{key : 'Sgs-Channel', value : channelId}, {key : 'Sgs-Data', value : this.base64_encode(data)}]);
	},
	
	_handleServerResponse : function(opcode, response) {
		switch(opcode) {
			case this.OP.NOP:
			case this.OP.LOGIN_REQUEST:
			case this.OP.RECONNECT_REQUEST:
			case this.OP.LOGOUT_REQUEST:
				this._log('Strange op code for request: ' + opcode);
				
				if(this.callbackObject !== null && this.callbackObject.error !== null) {
					this.callbackObject.error('Invalid op code received from server: ' + opcode);
				}
				break;
			case this.OP.LOGIN_SUCCESS:
				this.session = response.s;
				this._log('Login successful (session:' + this.session + ')');
				
				if(this.callbackObject !== null && this.callbackObject.login !== null) {
					this.callbackObject.login(this.session, this.username);
				}
				break;
			case this.OP.LOGIN_FAILURE:
				this.session = null;
				this.username = null;
				this._log('Could not login:' + response.r);
				
				if(this.callbackObject !== null && this.callbackObject.loginFailure !== null) {
					this.callbackObject.loginFailure(response.r);
				}
				break;
			case this.OP.LOGIN_REDIRECT:
				this._log('Login redirect not supported by client! (LOGIN_REDIRECT)');
				break;
			case this.OP.RECONNECT_SUCCESS:
				this._log('Login redirect not supported by client! (RECONNECT_SUCCESS)');
				break;
			case this.OP.RECONNECT_FAILURE:
				this._log('Login redirect not supported by client! (RECONNECT_FAILURE)');
				break;
			case this.OP.SESSION_MESSAGE:
				var r = this.base64_decode(response.b);
				this._log('Got session message: ' + r);
				
				if(this.callbackObject !== null && this.callbackObject.sessionMessage !== null) {
					this.callbackObject.sessionMessage(r);
				}
				break;
			case this.OP.LOGOUT_SUCCESS:
				this.session = null;
				this.username = null;
				this._log('logged out');
				
				if(this.callbackObject !== null && this.callbackObject.logout !== null) {
					this.callbackObject.logout();
				}
				break;
			case this.OP.CHANNEL_JOIN:
				this._log('Joined channel: ' + response.c + '(' + response.i + ')');
				
				if(this.callbackObject !== null && this.callbackObject.channelJoin !== null) {
					this.callbackObject.channelJoin(response.i, response.c);
				}
				break;
			case this.OP.CHANNEL_LEAVE:
				this._log('Left channel: ' + '(' + response.i + ')');
				
				if(this.callbackObject !== null && this.callbackObject.channelLeft !== null) {
					this.callbackObject.channelLeft(response.i);
				}
				break;
			case this.OP.CHANNEL_MESSAGE:
				var r = this.base64_decode(response.b);
				this._log('Channel ' + response.i + ' message: ' + r);
				
				if(this.callbackObject !== null && this.callbackObject.channelMessage !== null) {
					this.callbackObject.channelMessage(response.i, r);
				}
				break;
			default:
				this._log('Opcode: ' + opcode + ' data:' + response);
				
				if(this.callbackObject !== null && this.callbackObject.error !== null) {
					this.callbackObject.error('Unknown op code received from server: ' + opcode);
				}
		}
		
	},
	
	_log : function(text) {
		//document.result.rb.value = document.result.rb.value + '\n' + text;
	},
	
	testCounter : 0,
	
	/**
	* @param operation 	(byte) the opcode for the operation we want to invoke on the server
	* @param data 		(array) of key-value object which gets sendet to the server 
	*					([{key : <key>, value : <value>}, ...]).
	*					This paramter is optinal
	**/
	_request : function(operation, data, createNextConnection) {
		if(typeof(createNextConnection) == "undefined"){
		  createNextConnection = true;
		}
		this.nextRequest = true;
		request = this._makeHttpObject();
		request.vtest = ++this.testCounter;
		request.open("GET", this.serverUrl, true);
		request.setRequestHeader('Sgs-Op', operation);
		if(this.session !== null) {
			request.setRequestHeader('Sgs-Session', this.session);
		}
		if(data !== null) {
			for(i = 0; i < data.length; i++) {
				request.setRequestHeader(data[i].key, data[i].value);
			}
		}
		
		request.send(null);
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				sgsNetwork._log('==> ' + request.vtest + ' status: ' + request.status);
				if (request.status == 200) {
					var d = eval('(' + request.responseText + ')');
					sgsNetwork.nextRequest = false;
					sgsNetwork._log('==> ' + request.responseText + " (" + d.length + ")");
					for(i = 0; i < d.length; i++) {
						sgsNetwork._log('Handle ' + i);
						sgsNetwork._handleServerResponse(d[i].o, d[i]);
					}
					
					sgsNetwork._log('==> nextCon: ' + createNextConnection + ' session is not null: ' + (sgsNetwork.session !== null));
					if(createNextConnection && sgsNetwork.session !== null && !sgsNetwork.nextRequest) {
						// no new request was made to the server
						sgsNetwork._request(sgsNetwork.OP.NOP, null);
					}
				}
				else {
					sgsNetwork.session = null;
					sgsNetwork.username = null;
					
					if(sgsNetwork.callbackObject !== null && sgsNetwork.callbackObject.error !== null) {
						sgsNetwork.callbackObject.error('Network error status is:' + request.status);
					}
				}
			}
		};
	},
	
	_makeHttpObject : function() {
		try {
			return new XMLHttpRequest();
		}
		catch (error) {}
		try {
			return new ActiveXObject("Msxml2.XMLHTTP");
		}
		catch (error) {}
		try {
			return new ActiveXObject("Microsoft.XMLHTTP");
		}
		catch (error) {}

		throw new Error("Could not create HTTP request object.");
	},
	
	base64_encode : function(data) {
		// from http://phpjs.org/functions/base64_encode:358
	    // http://kevin.vanzonneveld.net
	    // +   original by: Tyler Akins (http://rumkin.com)
	    // +   improved by: Bayron Guevara
	    // +   improved by: Thunder.m
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   bugfixed by: Pellentesque Malesuada
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // -    depends on: utf8_encode
	    // *     example 1: base64_encode('Kevin van Zonneveld');
	    // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='

	    // mozilla has this native
	    // - but breaks in 2.0.0.12!
	    //if (typeof this.window['atob'] == 'function') {
	    //    return atob(data);
	    //}

	    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

	    if (!data) {
	        return data;
	    }

	    data = this.utf8_encode(data+'');

	    do { // pack three octets into four hexets
	        o1 = data.charCodeAt(i++);
	        o2 = data.charCodeAt(i++);
	        o3 = data.charCodeAt(i++);

	        bits = o1<<16 | o2<<8 | o3;

	        h1 = bits>>18 & 0x3f;
	        h2 = bits>>12 & 0x3f;
	        h3 = bits>>6 & 0x3f;
	        h4 = bits & 0x3f;

	        // use hexets to index into b64, and append result to encoded string
	        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
	    } while (i < data.length);

	    enc = tmp_arr.join('');

	    switch (data.length % 3) {
	        case 1:
	            enc = enc.slice(0, -2) + '==';
	        break;
	        case 2:
	            enc = enc.slice(0, -1) + '=';
	        break;
	    }

	    return enc;
	},
	
	base64_decode : function(data) {
		// from  http://phpjs.org/functions/base64_decode:357
	    // http://kevin.vanzonneveld.net
	    // +   original by: Tyler Akins (http://rumkin.com)
	    // +   improved by: Thunder.m
	    // +      input by: Aman Gupta
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   bugfixed by: Onno Marsman
	    // +   bugfixed by: Pellentesque Malesuada
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +      input by: Brett Zamir (http://brett-zamir.me)
	    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // -    depends on: utf8_decode
	    // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
	    // *     returns 1: 'Kevin van Zonneveld'
	
	    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];

	    if (!data) {
	        return data;
	    }

	    data += '';

	    do {  // unpack four hexets into three octets using index points in b64
	        h1 = b64.indexOf(data.charAt(i++));
	        h2 = b64.indexOf(data.charAt(i++));
	        h3 = b64.indexOf(data.charAt(i++));
	        h4 = b64.indexOf(data.charAt(i++));

	        bits = h1<<18 | h2<<12 | h3<<6 | h4;

	        o1 = bits>>16 & 0xff;
	        o2 = bits>>8 & 0xff;
	        o3 = bits & 0xff;

	        if (h3 == 64) {
	            tmp_arr[ac++] = String.fromCharCode(o1);
	        } else if (h4 == 64) {
	            tmp_arr[ac++] = String.fromCharCode(o1, o2);
	        } else {
	            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
	        }
	    } while (i < data.length);

	    dec = tmp_arr.join('');
	    dec = this.utf8_decode(dec);

	    return dec;
	},
	
	utf8_encode : function( argString ) {
		// from http://phpjs.org/functions/utf8_encode:577
	    // http://kevin.vanzonneveld.net
	    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   improved by: sowberry
	    // +    tweaked by: Jack
	    // +   bugfixed by: Onno Marsman
	    // +   improved by: Yves Sucaet
	    // +   bugfixed by: Onno Marsman
	    // +   bugfixed by: Ulrich
	    // *     example 1: utf8_encode('Kevin van Zonneveld');
	    // *     returns 1: 'Kevin van Zonneveld'

	    var string = (argString+''); // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	    var utftext = "";
	    var start, end;
	    var stringl = 0;

	    start = end = 0;
	    stringl = string.length;
	    for (var n = 0; n < stringl; n++) {
	        var c1 = string.charCodeAt(n);
	        var enc = null;

	        if (c1 < 128) {
	            end++;
	        } else if (c1 > 127 && c1 < 2048) {
	            enc = String.fromCharCode((c1 >> 6) | 192) + String.fromCharCode((c1 & 63) | 128);
	        } else {
	            enc = String.fromCharCode((c1 >> 12) | 224) + String.fromCharCode(((c1 >> 6) & 63) | 128) + String.fromCharCode((c1 & 63) | 128);
	        }
	        if (enc !== null) {
	            if (end > start) {
	                utftext += string.substring(start, end);
	            }
	            utftext += enc;
	            start = end = n+1;
	        }
	    }

	    if (end > start) {
	        utftext += string.substring(start, string.length);
	    }

	    return utftext;
	},
	
	utf8_decode : function( str_data ) {
		// from http://phpjs.org/functions/utf8_decode:576
	    // http://kevin.vanzonneveld.net
	    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
	    // +      input by: Aman Gupta
	    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // +   improved by: Norman "zEh" Fuchs
	    // +   bugfixed by: hitwork
	    // +   bugfixed by: Onno Marsman
	    // +      input by: Brett Zamir (http://brett-zamir.me)
	    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	    // *     example 1: utf8_decode('Kevin van Zonneveld');
	    // *     returns 1: 'Kevin van Zonneveld'

	    var tmp_arr = [], i = 0, ac = 0, c1 = 0, c2 = 0, c3 = 0;

	    str_data += '';

	    while ( i < str_data.length ) {
	        c1 = str_data.charCodeAt(i);
	        if (c1 < 128) {
	            tmp_arr[ac++] = String.fromCharCode(c1);
	            i++;
	        } else if ((c1 > 191) && (c1 < 224)) {
	            c2 = str_data.charCodeAt(i+1);
	            tmp_arr[ac++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
	            i += 2;
	        } else {
	            c2 = str_data.charCodeAt(i+1);
	            c3 = str_data.charCodeAt(i+2);
	            tmp_arr[ac++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
	            i += 3;
	        }
	    }

	    return tmp_arr.join('');
	},
	
	OP : {
		NOP 				: 0,
		LOGIN_REQUEST 		: 1,
		LOGIN_SUCCESS 		: 11,
		LOGIN_FAILURE 		: 12,
		LOGIN_REDIRECT 		: 13,
		RECONNECT_REQUEST 	: 5,
		RECONNECT_SUCCESS 	: 14,
		RECONNECT_FAILURE 	: 15,
		SESSION_MESSAGE 	: 3,
		LOGOUT_REQUEST 		: 2,
		LOGOUT_SUCCESS 		: 99,
		CHANNEL_JOIN 		: 50,
		CHANNEL_LEAVE 		: 51,
		CHANNEL_MESSAGE 	: 4
	}
}