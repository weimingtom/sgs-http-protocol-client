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
import java.util.HashSet;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.sun.sgs.app.AppContext;
import com.sun.sgs.app.Channel;
import com.sun.sgs.app.ChannelListener;
import com.sun.sgs.app.ClientSession;
import com.sun.sgs.app.Delivery;
import com.sun.sgs.app.ManagedObject;
import com.sun.sgs.app.ManagedReference;

class ChatRoom implements ManagedObject, Serializable, ChannelListener {
	private static final long serialVersionUID = 1L;
	private static final Logger logger = Logger.getLogger(ChatRoom.class.getName());

	private Set<String> users = new HashSet<String>();
	private String name;

	private ManagedReference<Channel> channel;

	public ChatRoom(String name) {
		AppContext.getDataManager().setBinding("rooms." + name, this);
		Channel c = AppContext.getChannelManager().createChannel(name, this, Delivery.RELIABLE);
		channel = AppContext.getDataManager().createReference(c);
	}

	public String getName() {
		return name;
	}

	public boolean join(User user) {
		if (users.contains(user.getName())) {
			return false;
		}
		users.add(user.getName());
		ClientSession cs = user.getSession();
		channel.get().join(cs);
		cs.send(ByteBuffer.wrap(("list/" + getUserList()).getBytes()));

		String msg = ":" + user.getName() + " joined channel";
		channel.get().send(null, ByteBuffer.wrap(msg.getBytes()));
		return true;
	}

	public void leave(User user) {
		if (!users.contains(user.getName())) {
			return;
		}
		users.remove(user.getName());
		channel.get().leave(user.getSession());

		String msg = ":" + user.getName() + " left channel";
		channel.get().send(null, ByteBuffer.wrap(msg.getBytes()));
	}

	public String getUserList() {
		StringBuffer sb = new StringBuffer();
		boolean first = true;
		for (String user : users) {
			if (!first) {
				sb.append(",");
			} else {
				first = false;
			}
			sb.append(user);
		}
		return sb.toString();
	}

	public void receivedMessage(Channel channel, ClientSession session, ByteBuffer message) {
		if (logger.isLoggable(Level.INFO)) {
			logger.log(Level.INFO, "Channel message from {0} on channel {1}", new Object[] { session.getName(), channel.getName() });
		}

		byte[] b = new byte[message.limit()];
		message.get(b);

		String msg = session.getName() + ": " + new String(b);
		channel.send(session, ByteBuffer.wrap(msg.getBytes()));
	}
}
