#!/usr/bin/env python3
"""Genera noticias-hoy.json para GitHub Pages usando RSS públicos.

No inventa titulares y evita mezclar noticias de días distintos.
Si una fuente no responde, la marca como no disponible.
"""
import datetime as dt
import email.utils
import html
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Argentina/Buenos_Aires")
NOW = dt.datetime.now(TZ)
TODAY = NOW.date().isoformat()
FEEDS = {
    "lanacion": [
        "https://www.lanacion.com.ar/arc/outboundfeeds/rss/",
        "https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml",
    ],
    "pagina12": [
        "https://www.pagina12.com.ar/arc/outboundfeeds/rss/portada",
        "https://www.pagina12.com.ar/rss/portada",
    ],
    "clarin": ["https://www.clarin.com/rss/lo-ultimo/"],
    "eldestape": [
        "https://www.eldestapeweb.com/feed",
        "https://www.eldestapeweb.com/rss",
        "https://news.google.com/rss/search?q=site%3Aeldestapeweb.com+when%3A1d&hl=es-419&gl=AR&ceid=AR%3Aes",
    ],
}
DOMAINS = {
    "lanacion": "lanacion.com.ar",
    "pagina12": "pagina12.com.ar",
    "clarin": "clarin.com",
    "eldestape": "eldestapeweb.com",
}

class StripHTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_data(self, value):
        self.parts.append(value)

def plain(value):
    p = StripHTML()
    try: p.feed(html.unescape(value or ""))
    except Exception: return ""
    return re.sub(r"\s+", " ", " ".join(p.parts)).strip()

def get_text(node, names):
    for child in node:
        if child.tag.split("}")[-1].lower() in names and child.text:
            return child.text.strip()
    return ""

def parse_date(value):
    if not value: return None
    try:
        date = email.utils.parsedate_to_datetime(value)
        if date:
            if date.tzinfo is None: date = date.replace(tzinfo=dt.timezone.utc)
            return date.astimezone(TZ)
    except (TypeError, ValueError): pass
    try:
        date = dt.datetime.fromisoformat(value.replace("Z","+00:00"))
        if date.tzinfo is None: date = date.replace(tzinfo=dt.timezone.utc)
        return date.astimezone(TZ)
    except (TypeError, ValueError): return None

def validate(url, publication):
    if not url.startswith(("https://", "http://")): return False
    hostname = (urllib.parse.urlparse(url).hostname or "").lower()
    expected = DOMAINS[publication]
    if publication == "eldestape" and hostname == "news.google.com":
        return True  # enlace de Google Noticias hacia una nota atribuida a El Destape
    return hostname == expected or hostname.endswith("."+expected)

def fetch(url):
    req = urllib.request.Request(url,headers={
        "User-Agent":"Mozilla/5.0 (compatible; Majane-News-Reader/1.0; educational RSS reader)",
        "Accept":"application/rss+xml, application/xml, text/xml, */*",
    })
    with urllib.request.urlopen(req, timeout=16) as resp:
        return resp.read(2500000)

def parse(xml, publication):
    root = ET.fromstring(xml)
    candidates = [element for element in root.iter() if element.tag.split("}")[-1].lower() in ("item","entry")]
    output = []; unique = set()
    for item in candidates:
        title=plain(get_text(item,{"title"}))
        summary=plain(get_text(item,{"description","summary","content","encoded"}))
        link=get_text(item,{"link"})
        if not link:
            for child in item:
                if child.tag.split("}")[-1].lower()=="link" and child.attrib.get("href"):
                    link=child.attrib["href"];break
        if not title or not link or not validate(link,publication):continue
        when=parse_date(get_text(item,{"pubdate","published","updated","date"}))
        if not when or when.date().isoformat()!=TODAY:continue
        if publication=="eldestape" and (urllib.parse.urlparse(link).hostname or "").endswith("google.com"):
            source=get_text(item,{"source"})
            if "destape" not in source.lower() and "destape" not in title.lower():
                continue
            title=re.sub(r"\s+-\s+El Destape\s*$","",title,flags=re.I)
        if title in unique:continue
        unique.add(title)
        # No generar un resumen: se toma el fragmento publicado por la fuente, si existe.
        summary=summary[:350]
        output.append({"titulo":title[:230],"resumen":summary,
                       "url":link,"fecha":when.isoformat()})
    return sorted(output,key=lambda x:x["fecha"],reverse=True)[:24]

def main():
    news={};status={}
    for publication,urls in FEEDS.items():
        article_list=[]
        for url in urls:
            try:
                article_list=parse(fetch(url),publication)
                if article_list: break
            except (OSError,ValueError,ET.ParseError,TimeoutError) as e:
                print(publication,repr(e),flush=True)
        news[publication]=article_list
        status[publication]="ok" if article_list else "sin_noticias_confirmadas_hoy"
        print(publication,len(article_list),"artículos de hoy",flush=True)
    payload={"fecha":TODAY,"actualizado":NOW.isoformat(),
             "fuentes":news,"estado":status,
             "aviso":"Titulares y fragmentos publicados por cada fuente; no son portadas impresas."}
    Path("noticias-hoy.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":main()
