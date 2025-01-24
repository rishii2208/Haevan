"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handelStart = handelStart;
exports.handelDisconnect = handelDisconnect;
exports.getType = getType;
const uuid_1 = require("uuid");
function handelStart(roomArr, socket, cb, io) {
    // check available rooms
    let availableroom = checkAvailableRoom();
    if (availableroom.is) {
        socket.join(availableroom.roomid);
        cb('p2');
        closeRoom(availableroom.roomid);
        if (availableroom === null || availableroom === void 0 ? void 0 : availableroom.room) {
            io.to(availableroom.room.p1.id).emit('remote-socket', socket.id);
            socket.emit('remote-socket', availableroom.room.p1.id);
            socket.emit('roomid', availableroom.room.roomid);
        }
    }
    // if no available room, create one
    else {
        let roomid = (0, uuid_1.v4)();
        socket.join(roomid);
        roomArr.push({
            roomid,
            isAvailable: true,
            p1: {
                id: socket.id,
            },
            p2: {
                id: null,
            }
        });
        cb('p1');
        socket.emit('roomid', roomid);
    }
    /**
     *
     * @param roomid
     * @desc search though roomArr and
     * make isAvailable false, also se p2.id
     * socket.id
     */
    function closeRoom(roomid) {
        for (let i = 0; i < roomArr.length; i++) {
            if (roomArr[i].roomid == roomid) {
                roomArr[i].isAvailable = false;
                roomArr[i].p2.id = socket.id;
                break;
            }
        }
    }
    /**
     *
     * @returns Object {is, roomid, room}
     * is -> true if foom is available
     * roomid -> id of the room, could be empth
     * room -> the roomArray, could be empty
     */
    function checkAvailableRoom() {
        for (let i = 0; i < roomArr.length; i++) {
            if (roomArr[i].isAvailable) {
                return { is: true, roomid: roomArr[i].roomid, room: roomArr[i] };
            }
            if (roomArr[i].p1.id == socket.id || roomArr[i].p2.id == socket.id) {
                return { is: false, roomid: "", room: null };
            }
        }
        return { is: false, roomid: '', room: null };
    }
}
/**
 * @desc handels disconnceition event
 */
function handelDisconnect(disconnectedId, roomArr, io) {
    for (let i = 0; i < roomArr.length; i++) {
        if (roomArr[i].p1.id == disconnectedId) {
            io.to(roomArr[i].p2.id).emit("disconnected");
            if (roomArr[i].p2.id) {
                roomArr[i].isAvailable = true;
                roomArr[i].p1.id = roomArr[i].p2.id;
                roomArr[i].p2.id = null;
            }
            else {
                roomArr.splice(i, 1);
            }
        }
        else if (roomArr[i].p2.id == disconnectedId) {
            io.to(roomArr[i].p1.id).emit("disconnected");
            if (roomArr[i].p1.id) {
                roomArr[i].isAvailable = true;
                roomArr[i].p2.id = null;
            }
            else {
                roomArr.splice(i, 1);
            }
        }
    }
}
// get type of person (p1 or p2)
function getType(id, roomArr) {
    for (let i = 0; i < roomArr.length; i++) {
        if (roomArr[i].p1.id == id) {
            return { type: 'p1', p2id: roomArr[i].p2.id };
        }
        else if (roomArr[i].p2.id == id) {
            return { type: 'p2', p1id: roomArr[i].p1.id };
        }
    }
    return false;
}
