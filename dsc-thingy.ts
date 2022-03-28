import * as Discord from "discord.js";
import * as request from "request";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import * as url from "url";
import * as querystring from "querystring";
import * as moment from "moment";
import * as cron from "node-cron";

async function main() {
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "config.json"), "utf8"));
    const client = new Discord.Client();
    const webhooks = JSON.parse(fs.readFileSync(path.resolve(__dirname, "webhooks.json"), "utf8"));
    const webhooksByChannel = webhooks.reduce((acc, webhook) => {
        if (!acc[webhook.channelId]) {
            acc[webhook.channelId] = [];
        }
        acc[webhook.channelId].push(webhook);
        return acc;
    }, {});

    client.on("ready", async () => {
        console.log("ready");
        const channels = client.channels.cache.array();
        for (const channel of channels) {
            if (channel.type !== "text") {
                continue;
            }
            const webhooks = webhooksByChannel[channel.id];
            if (!webhooks) {
                continue;
            }
            for (const webhook of webhooks) {
                if (webhook.enabled) {
                    await checkWebhook(channel, webhook);
                }
            }
        }
    });

    client.on("message", async (message) => {
        if (message.content.startsWith("!check")) {
            const args = message.content.split(" ");
            if (args.length < 2) {
                return;
            }
            const channel = client.channels.cache.get(args[1]);
            if (!channel) {
                return;
            }
            const webhooks = webhooksByChannel[channel.id];
            if (!webhooks) {
                return;
            }
            for (const webhook of webhooks) {
                if (webhook.enabled) {
                    await checkWebhook(channel, webhook);
                }
            }
        }
    });

    client.login(config.token);

    cron.schedule("*/5 * * * *", async () => {
        const channels = client.channels.cache.array();
        for (const channel of channels) {
            if (channel.type !== "text") {
                continue;
            }
            const webhooks = webhooksByChannel[channel.id];
            if (!webhooks) {
                continue;
            }
            for (const webhook of webhooks) {
                if (webhook.enabled) {
                    await checkWebhook(channel, webhook);
                }
            }
        }
    });
}

