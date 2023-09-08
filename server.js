let express = require('express');
let bodyparser = require('body-parser');
// var mysql       = require('mysql');
const path = require('path');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const User = require("./user.model")
const mongoose = require('mongoose')
const bcrypt = require("bcrypt");
const port = 8082;

app.use(express.static('app'));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules',)));
app.use(bodyparser.json());
app.use(express.json());

let clientSocketIds = [];
let connectedUsers = [];
// const connection = mysql.createConnection({
//     host     : 'localhost',
//     user     : 'root',
//     password : '',
//     database : 'chat'
// });

const connection = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/Instagram_db");
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB', error);

    };
}

connection();


// app.post('/login', async(req, res) => {
//     // connection.query(`SELECT user_name, user_id, user_full_name, user_image from chat_users where username="${req.body.username}" AND password="${req.body.password}"`, function (error, results, fields) {
//     //     if (error) throw error;

//     //     if(results.length == 1) {
//     //         res.send({status:true, data: results[0]})
//     //     } else {
//     //         res.send({status:false})
//     //     }
//     // });

//     const { username, password } = req.body;

//     await User.findOne(
//         {
//             username: username,
//             password: password
//         },
//         {
//             username: 1,
//             _id: 1,
//             name: 1
//         },
//         (err, user) => {
//             if (err) {
//                 // Handle the error
//                 throw err;
//                 // console.error(err);
//                 // return res.status(500).json({ error: 'An error occurred' });
//             }

//             if (!user) {
//                 // User not found
//                 return res.status(404).json({ status: false });
//             }

//             // User found, send the user data
//             return res.json({ status: true, data: user });
//         }
//     );
// })


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne(
            {
                username: username,
                password: password,
            },
            {
                username: 1,
                _id: 1,
                name: 1
            }
        );

        if (!user) {
            return res.status(404).json({ status: false });
        }

        return res.json({ status: true, data: user });
    } catch (err) {
        // Handle the error
        console.error(err);
        return res.status(500).json({ error: 'An error occurred' });
    }
});



const getSocketByUserId = (userId) => {
    let socket = '';
    for (let i = 0; i < clientSocketIds.length; i++) {
        if (clientSocketIds[i].userId == userId) {
            socket = clientSocketIds[i].socket;
            break;
        }
    }
    return socket;
}

/* socket function starts */
io.on('connection', socket => {
    console.log('conected')
    socket.on('disconnect', () => {
        console.log("disconnected")
        connectedUsers = connectedUsers.filter(item => item.socketId != socket.id);
        io.emit('updateUserList', connectedUsers)
    });

    socket.on('loggedin', function (user) {
        clientSocketIds.push({ socket: socket, userId: user._id });
        connectedUsers = connectedUsers.filter(item => item._id != user._id);
        connectedUsers.push({ ...user, socketId: socket.id })
        io.emit('updateUserList', connectedUsers)
    });

    socket.on('create', function (data) {
        console.log("create room")
        socket.join(data.room);
        let withSocket = getSocketByUserId(data.withUserId);
        socket.broadcast.to(withSocket.id).emit("invite", { room: data })
    });
    socket.on('joinRoom', function (data) {
        socket.join(data.room.room);
    });

    socket.on('message', function (data) {
        socket.broadcast.to(data.room).emit('message', data);
    })
});
/* socket function ends */
console.log(connectedUsers);
console.log(clientSocketIds);

server.listen(port, function () {
    console.log(`server started at http://localhost:${port}`)
});