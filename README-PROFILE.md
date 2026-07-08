# Profielfoto: richtlijnen en responsive afbeeldingen

Als je de bijgevoegde afbeelding als profielfoto wilt gebruiken, voeg de geoptimaliseerde versies (aanbevolen bestandsnamen hieronder) toe aan de map `bio/`:

- `bio/profile.jpg` (basisversie)
- `bio/profile-400.jpg` (400px breed)
- `bio/profile-800.jpg` (800px breed)
- `bio/profile-1200.jpg` (1200px breed)

De pagina gebruikt automatisch `srcset` en `sizes` om de juiste resolutie te kiezen. Als geen afbeelding aanwezig is, valt de site terug op een veilige SVG-placeholder.

Aanbevolen crop / formaat
- Crop vierkant (1:1) met de focus op het gezicht of symmetrische compositie.
- Zorg voor voldoende ruimte rond het onderwerp (geen afkapte randen).
- Sla op als JPEG met kwaliteitsniveau 75–85 voor web (of gebruik WebP als je hosting ondersteunt).

Voorbeeld ImageMagick-commando's:

```bash
# Maak responsive versies
magick input.jpg -resize 400x400 -quality 82 bio/profile-400.jpg
magick input.jpg -resize 800x800 -quality 82 bio/profile-800.jpg
magick input.jpg -resize 1200x1200 -quality 82 bio/profile-1200.jpg
magick input.jpg -resize 1000x1000 -quality 82 bio/profile.jpg
```

Of met `cjpeg`/`mozjpeg` voor betere compressie:

```bash
convert input.jpg -resize 1200x1200 -strip -quality 82 -sampling-factor 2x1 jpg:- | cjpeg -quality 82 > bio/profile-1200.jpg
```

Privacy & content
- Gebruik alleen een afbeelding waar je comfortabel mee bent dat die publiek te zien is.
- Als je liever geen persoonlijke foto wilt, kun je een artistieke of anonieme profielfoto gebruiken (bv. een deel van een gerecht of een abstracte textuur).
