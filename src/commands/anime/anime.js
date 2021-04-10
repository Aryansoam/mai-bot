const moment = require('moment');
const { getInfoFromName } = require('mal-scraper');
const { MessageEmbed } = require('discord.js');

module.exports = {
  name: 'anime',
  aliases: [ 'ani', 'as', 'anisearch'],
  cooldown: {
    time: 10000,
    message: 'You are going too fast. Please slow down to avoid getting rate-limited!'
  },
  requiresDatabase: false,
  rankcommand: false,
  clientPermissions: [ 'EMBED_LINKS' ],
  group: 'anime',
  description: 'Searches for a specific anime in <:mal:767062339177676800> [MyAnimeList](https://myanimelist.net "Homepage"), or shows Mai\'s anime series information if no query is provided.',
  parameters: [ 'Search Query' ],
  examples: [
    'anime',
    'as seishun buta yarou',
    'ani aobuta',
    'anisearch bunnygirl senpai'
  ],
  run: async (message, language, args) => {

    const query = args.join(' ') || 'Seishun Buta Yarou';

    message.channel.startTyping();

    const data = await new Promise((resolve,reject) => {
      setTimeout(() => reject('TIMEOUT'), 10000);

      return getInfoFromName(query)
      .then(res => resolve(res))
      .catch(err => reject(err));
    }).catch((err)=> err !== 'TIMEOUT' ? null : err);

    if (!data){
      const parameters = { '%AUTHOR%': message.author.tag, '%QUERY%': query };
      const no_data_response = language.get({ id: 'NO_DATA', parameters });
      return message.channel.send(no_data_response).then(() => message.channel.stopTyping());
    } else if (data === 'TIMEOUT'){
      const parameters = { '%AUTHOR%': message.author.tag };
      const timeout_response = language.get({ id: 'TIMEOUT', parameters });
      return message.channel.send(timeout_response).then(() => message.channel.stopTyping());
    };

    message.channel.stopTyping();

    const isHentai = data.genres.some(x => x === 'Hentai');
    const nsfwch = message.guild.channels.cache.filter(x => x.nsfw).map(x => x.toString());

    if (isHentai && message.channel.nsfw === false){
      const parameters = {
        '%AUTHOR%': message.author.tag,
        '%QUERY%': query,
        '%ANIME_STUDIO%': data.studios?.[0] || 'Unknown Publisher',
        '%NSFW_CHANNELS%': nsfwch.length ? ` such as ${message.client.services.UTIL.ARRAY.join(nsfwch)}` : ''
      };
      const nsfw_response = language.get({ id: 'NONNSFW', parameters });
      return message.channel.send(nsfw_response);
    };

    const { NUMBER, STRING, ARRAY } = message.client.services.UTIL;
    const response = new MessageEmbed()
    .setURL(data.url)
    .setColor(isHentai ? 'RED' : 'GREY')
    .setThumbnail(data.picture || null)
    .setFooter(`Anime Query with MAL\u2000|\u2000${message.client.user.username} Bot\u2000|\u2000\©️${new Date().getFullYear()} Mai`)
    .setTitle(STRING.truncate(data.englishTitle || data.title, 200))
    .setDescription([
      [
        `[\\⭐](https://myanimelist.net/anime/${data.id}/stats 'Score'): ${data.score}`,
        `[\\🏅](https://myanimelist.net/info.php?go=topanime 'Rank'): ${isNaN(data.ranked.slice(1)) ? 'N/A' : NUMBER.ordinalize((data.ranked).slice(1))}`,
        `[\\✨](https://myanimelist.net/info.php?go=topanime 'Popularity'): ${data.popularity || '~'}`,
        `[\` ▶ \`](${data.trailer} 'Watch Trailer')`
      ].join('\u2000\u2000•\u2000\u2000'),
      `\n${ARRAY.join(data.genres.map(g =>
        `[${g}](https://myanimelist.net/anime/genre/${message.client.services.MAL.genres[g.toLowerCase()]})`
      )||[])}`,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ].filter(Boolean).join('\n'))
    .addFields([
      {
        name: 'Source', inline: true,
        value: data.source ? [data.source].map(x => `[**${x}**](https://myanimelist.net/topmanga.php?type=${message.client.services.MAL.sources[x] || 'manga'})`)[0] : '**Unknown**',
      },{
        name: 'Episodes', inline: true,
        value: `[**${data.episodes}**](https://myanimelist.net/anime/${data.id}/_/episode)`,
      },{
        name: 'Duration', inline: true,
        value: data.duration || 'Unknown',
      },{
        name: 'Type', inline: true,
        value: data.type ? `[**${data.type}**](https://myanimelist.net/topanime.php?type=${encodeURI(data.type.toLowerCase())})` : '**showType Unavailable**'
      },{
        name: 'Premiered', inline: true,
        value: data.premiered && data.premiered !== '?' ? `[**${data.premiered}**](https://myanimelist.net/anime/season/${data.premiered.split(' ')[1]}/${data.premiered.split(' ')[0]?.toLowerCase()})` : '**Unknown**'
      },{
        name: 'Studio', inline: true,
        value: `[**${data.studios?.[0]}**](https://myanimelist.net/anime/producer/${message.client.services.MAL.producers[data.studios?.[0]]}/)` || '**Unknown**'
      },{
        name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        value: STRING.truncate(data.synopsis||'No Synopsis', 500, `...\n\n[**\`📖 Read Full Synopsis\`**](${data.url} 'Read More on MyAnimeList')`),
      },{
        name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        value: [
          `**${data.status === 'Finished Airing' ? 'Aired' : data.status === 'Currently Airing' ? 'Currently Airing' : 'Airs on'} (*${moment(data.aired.split('to')[0], 'll').fromNow()}*):** ${data.aired || 'Unknown'}`,
          '',
          `**Producers**: ${STRING.truncate(ARRAY.join(data.producers?.map(x => x === 'None found, add some' ? x : `[${x}](https://myanimelist.net/anime/producer/${message.client.services.MAL.producers[x]}/)`)||[]) || 'Unknown' ,900, '...')}`,
          '',
          `**Rating**: *${data.rating.replace('None', '') || 'Unrated'}*`,
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ].join('\n')
      }
    ]);

    return message.channel.send(response);
  }
};
