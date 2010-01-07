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

package ch.vmac.sgs.http.example1;


import java.io.Serializable;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.sun.sgs.app.AppContext;
import com.sun.sgs.app.AppListener;
import com.sun.sgs.app.ClientSession;
import com.sun.sgs.app.ClientSessionListener;
import com.sun.sgs.app.ManagedReference;

/**
 * The main class of the example.
 * @author Christiaan Verbree
 *
 */
public class HttpChat implements Serializable, AppListener {
	private static final long serialVersionUID = 1L;
	private static final Logger logger = Logger.getLogger(HttpChat.class.getName());

	private ManagedReference<ChatRoom> master = null;

	public void initialize(Properties props) {
		ChatRoom m = new ChatRoom("master");
		master = AppContext.getDataManager().createReference(m);
	}

	public ClientSessionListener loggedIn(ClientSession session) {
		logger.log(Level.INFO, "User {0} has logged in", session.getName());
		
		User u = new User(session, master.get());
		return u;
	}
}
