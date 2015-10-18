# Installation #
  * To use the example put the jar file into the sgs deploy folder of your ds installation.
  * Put the sgsClient.js and the index.html into the working directory of your ds installation.
  * Start the darkstar server
  * Go to http://localhost:1139/d/

# Chat commands #
  * /leave
  * /join _channel_ (only master at the moment)
  * /random just for fun
  * /logout

# App.properties #
The jar file of the example contains this file important is the following line:

`com.sun.sgs.impl.service.session.protocol.acceptor=ch.vmac.sgs.protocol.http.SgsHttpProtocolAcceptor`