const mqtt = require('mqtt');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 8000;

// MQTT broker URL (you can use a public or local broker)
const brokerUrl = 'mqtt://mosquitto'; // Example using HiveMQ public broker
const client = mqtt.connect(brokerUrl);

const registry = [];

// Middleware to parse JSON data
app.use(express.urlencoded({ extended: false })).use(express.json());

function publishMessage(topic, message) {
    try {
        // Publish a message to a topic
        client.publish(topic, JSON.stringify(message));
        console.log(`\nPublishing message to topic "${topic}":\n`, message);
    } catch (error) {
        console.error('Error publishing message:', error);
    }
}

function subscribeToTopic(topic) {
    client.subscribe(topic, (err) => {
        if (err) {
            console.error('Error subscribing to topic:', err);
        } else {
            console.log(`Subscribed to topic: ${topic}`);
        }
    });
}

// When the client receives a message
client.on('message', (topic, message) => {
    // { 'esp32' : 174, 'name' : 'Lucas Sanchez', 'total_blinks' : total_blinks, 'current_delay' : delay }
    try {
        const parsedMessage = JSON.parse(message.toString());
        console.log(`\nMessage received on topic "${topic}":\n`, parsedMessage);
    
        if (parsedMessage.esp32) {
            const esp32 = parsedMessage.esp32;
            // Find the ESP32 record
            const index = registry.findIndex((item) => item === esp32);
            if (index === -1) {
                registry.push(esp32);
                console.log('-----------------------------------------------------');
                console.log(`        ESP32 ${esp32} added to the registry`);
                console.log('Current registry:', registry);
                console.log('-----------------------------------------------------');
            }
        }
    }
    catch (error) {
        console.error('Error receiving message:', error);
    }
});

// Error handling
client.on('error', (err) => {
    console.error('Connection error:', err);
});

// Application route
app.post('/control', (req, res) => {
    try {
        // { "esp32" : XXX, "new_delay" : ZZZ }
        console.log(`\nRequest received on route "/control":\n\t`, req.body);
        const message = req.body;
        const esp32 = message.esp32;

        if (!esp32) {
            for (let i = 0; i < registry.length; i++) {
                const topic_pub = `upb/control`;
                const new_message = {
                    esp32: registry[i], 
                    new_delay: message.new_delay
                };
                publishMessage(topic_pub, new_message);
                console.log(`Message sent to ESP32 ${registry[i]}`);
            }
            return res.send(`Message sent to all ESP32 devices`);
        }
        // Find the ESP32 record
        const index = registry.findIndex((item) => item.esp32 === esp32);
        if (index !== -1) {
            // Send message to ESP32
            const topic_pub = `upb/control`;
            publishMessage(topic_pub, message);
            res.send(`Message sent to ESP32 ${esp32}`);
        } else {
            res.status(404).send(`ESP32 ${esp32} not found`);
        }
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Error processing request');
    }
});

// Start the server
app.listen(port, 
    () => {
        console.log("-----------------------------------------------------");
        console.log(`\n\nApplication started on port: ${port}\n\n`);
        console.log("-----------------------------------------------------");

        // Topic to subscribe and publish
        const topic_sub = 'upb/data/174';
        subscribeToTopic(topic_sub);
    }
);
