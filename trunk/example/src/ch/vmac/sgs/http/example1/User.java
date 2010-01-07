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
import java.nio.ByteBuffer;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.sun.sgs.app.AppContext;
import com.sun.sgs.app.ClientSession;
import com.sun.sgs.app.ClientSessionListener;
import com.sun.sgs.app.DataManager;
import com.sun.sgs.app.ManagedReference;
import com.sun.sgs.app.NameNotBoundException;
import com.sun.sgs.app.ObjectNotFoundException;

/**
 * The chat user class.
 * @author Christiaan Verbree
 *
 */
class User implements Serializable, ClientSessionListener {
	private static final long serialVersionUID = 1L;
	private static final Logger logger = Logger.getLogger(User.class.getName());

	private final ManagedReference<ClientSession> sessionReference;
	private final String sessionName;
	
	private ManagedReference<ChatRoom> room;

	public User(ClientSession session, ChatRoom channel) {
		if (session == null) {
			throw new NullPointerException("null session");
		}

		DataManager dataMgr = AppContext.getDataManager();
		sessionReference = dataMgr.createReference(session);
		sessionName = session.getName();

		channel.join(this);
		
		room = dataMgr.createReference(channel);
	}
	
	public String getName() {
		return sessionName;
	}

	public ClientSession getSession() {
		return sessionReference.get();
	}

	public void receivedMessage(ByteBuffer message) {
		if (logger.isLoggable(Level.FINE)) {
			logger.log(Level.FINE, "Message from {0}", sessionName);
		}
		
		byte[] b = new byte[message.limit()];
		message.get(b);
		String msg = new String(b).toLowerCase();
		if(msg.equalsIgnoreCase("/list")) {
			if(room == null) {
				send("No room joined");
				return;
			}
			
			send("list/" + room.get().getUserList());
		}
		else if(msg.startsWith("/join ")) {
			if(room != null) {
				send("Leave current channel first");
				return;
			}
			String[] s = msg.split(" ");
			String roomName = "rooms." + s[1];
			
			try {
				ChatRoom cr = (ChatRoom) AppContext.getDataManager().getBinding(roomName);
				cr.join(this);
				room = AppContext.getDataManager().createReference(cr);
			}
			catch (ObjectNotFoundException e) {
				send("join/object " + roomName + " was not found!");
			}
			catch (NameNotBoundException e) {
				send("join/Invalid room name: " + s[1]);
			}
		}
		else if(msg.equalsIgnoreCase("/leave")) {
			if(room == null) {
				send("leave/you are not in a room");
				return;
			}
			
			String n = room.get().getName();
			room.get().leave(this);
			room = null;
			send("leave/Room " + n + " left");
		}
		else if(msg.equalsIgnoreCase("/help")) {
			send("help/ask the admin ;-)");
		}
		else if(msg.equalsIgnoreCase("/random")) {
			send("random/" + (Math.random() * 100));
		}
		else {
			send("/" + msg);
		}
	}

	/**
	 * {@inheritDoc}
	 * <p>
	 * Logs when the client disconnects.
	 */
	public void disconnected(boolean graceful) {
		if(room != null) {
			room.get().leave(this);
		}
		String grace = graceful ? "graceful" : "forced";
		logger.log(Level.INFO, "User {0} has logged out {1}", new Object[] { sessionName, grace });
	}
	
	public void send(String msg) {
		sessionReference.get().send(ByteBuffer.wrap(msg.getBytes()));
	}
}
