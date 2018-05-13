import React, { Component } from "react";
import { createClient } from "contentful";
import { ServerStyleSheet } from "styled-components";
import axios from "axios";
import moment from "moment";
import md5 from 'md5';
import * as dotenv from "dotenv";
import fontLoader from "./config/fontLoader";
import cssLoader from "./config/cssLoader";
import sassLoader from "./config/sassLoader";

dotenv.config();

const contentful = createClient({
	space: process.env.CONTENTFUL_SPACE,
	accessToken: process.env.CONTENTFUL_TOKEN
});

function pickRandom(items, count, exclude = []) {
	let arr = items
		.filter(item => !exclude.includes(item))
		.sort(() => Math.floor(Math.random() * 3) - 1);

	arr.length = Number.isInteger(count) ? count : items.length;
	return arr;
}

function stripOutSysInfo(data) {
	if (Array.isArray(data)) {
		return data.map(child => {
			if (typeof child === "object") {
				return stripOutSysInfo(child);
			}
			return child;
		});
	}

	let copy = Object.assign({}, data.fields || data);
	Reflect.ownKeys(copy)
		.filter(key => typeof copy[key] === "object")
		.forEach(key => {
			copy[key] = stripOutSysInfo(copy[key]);
		});

	return copy;
}

let githubCache;

export default {
	getSiteData: async () => {
		let config = require("./src/config.json");
		let github = githubCache;

		if (!github) {
			console.log("=> getting github data...");
			const { data } = await axios.get(
				`https://api.github.com/users/${config.githubUsername}`
			);
			github = githubCache = data;
		}

		// get gravitar
		let gravitar = `https://www.gravatar.com/avatar/${md5(String(config.email).trim().toLowerCase())}?s=512`;

		return {
			github,
			...config,
			avatar: config.avatar || gravitar
		};
	},
	getRoutes: async () => {
		let { items: games } = await contentful.getEntries({
			content_type: "game"
		});
		let { items: pens } = await contentful.getEntries({
			content_type: "codePen"
		});

		games = games.sort((a, b) => {
			return moment(b.sys.updatedAt).diff(a.sys.updatedAt);
		});
		pens = pens.sort((a, b) => {
			return moment(b.sys.updatedAt).diff(a.sys.updatedAt);
		});

		const cleanedGames = stripOutSysInfo(games);
		const cleanedPens = stripOutSysInfo(pens);

		return [
			{
				path: "/",
				getData: () => ({
					games: cleanedGames,
					pens: pickRandom(cleanedPens, 6),
					rawPens: pens
				})
			},
			{
				path: "/games",
				getData: () => ({
					games: cleanedGames
				}),
				children: cleanedGames.map(game => ({
					path: `/${game.id}`,
					getData: () => ({
						game: game,
						otherGames: pickRandom(cleanedGames, 2, [game])
					})
				}))
			},
			{
				path: "/pens",
				getData: () => ({
					pens: cleanedPens
				}),
				children: cleanedPens.map(pen => ({
					path: `/${pen.id}`,
					getData: () => ({
						pen,
						otherPens: pickRandom(cleanedPens, 4, [pen])
					})
				}))
			},
			{
				path: "/search",
				getData: () => ({
					games: cleanedGames,
					pens: cleanedPens
				})
			}
		];
	},
	siteRoot: require("./src/config.json").siteUrl,
	renderToHtml: (render, Comp, meta) => {
		const sheet = new ServerStyleSheet();
		const html = render(sheet.collectStyles(<Comp />));
		meta.styleTags = sheet.getStyleElement();
		return html;
	},
	Document: class CustomHtml extends Component {
		render() {
			const { Html, Head, Body, children, renderMeta } = this.props;

			return (
				<Html lang="en-US">
					<Head>
						<meta charSet="UTF-8" />
						<meta
							name="viewport"
							content="width=device-width, initial-scale=1"
						/>
						{renderMeta.styleTags}
					</Head>
					<Body>{children}</Body>
				</Html>
			);
		}
	},
	webpack: (config, { defaultLoaders, stage }) => {
		config.module.rules = [
			{
				oneOf: [
					sassLoader(stage),
					cssLoader(stage),
					defaultLoaders.jsLoader,
					fontLoader(stage),
					defaultLoaders.fileLoader
				]
			}
		];
		config.devtool = stage === "dev" ? "source-map" : false;
		return config;
	}
};
