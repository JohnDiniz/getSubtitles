import he from 'he';
import axios from 'axios';
import { find } from 'lodash';
import striptags from 'striptags';

 export async function getSubtitles({
    videoID,
    lang = 'en',
    translate = false,
  }: {
    videoID: string,
    lang: string,
    translate: boolean,
  }) {
    const { data } = await axios.get(
      `https://youtube.com/watch?v=${videoID}`
    );
  
    // * ensure we have access to captions data
    if (!data.includes('captionTracks'))
      throw new Error(`Could not find captions for video: ${videoID}`);
  
    const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
    const [match] = regex.exec(data);
    const { captionTracks } = JSON.parse(`${match}}`);
    // console.log(captionTracks)
  
    const subtitle =
      find(captionTracks, {
        vssId: `.${lang}`,
      }) ||
      find(captionTracks, {
        vssId: `a.${lang}`,
      }) ||
      find(captionTracks, ({ vssId }) => vssId);

    console.log(subtitle.baseUrl+`&lang=${lang}`)
    
    const { data: transcript } = !translate ? await axios.get(subtitle.baseUrl) : await axios.get(subtitle.baseUrl+`&tlang=${lang}`) ;
    const lines = transcript
      .replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
      .replace('</transcript>', '')
      .split('</text>')
      .filter(line => line && line.trim())
      .map(line => {
        const startRegex = /start="([\d.]+)"/;
        const durRegex = /dur="([\d.]+)"/;
  
        const [, start] = startRegex.exec(line);
        const [, dur] = durRegex.exec(line);
  
        const htmlText = line
          .replace(/<text.+>/, '')
          .replace(/&amp;/gi, '&')
          .replace(/<\/?[^>]+(>|$)/g, '');
  
        const decodedText = he.decode(htmlText);
        const text = striptags(decodedText);
  
        return {
          start,
          dur,
          text,
        };
      });
  
    return lines;
  }