-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Song" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SongInstrument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "song_id" INTEGER NOT NULL,
    "instrument_id" INTEGER NOT NULL,
    CONSTRAINT "SongInstrument_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SongInstrument_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "Instrument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Module" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "song_instrument_id" INTEGER NOT NULL,
    "difficulty_level" INTEGER NOT NULL,
    "video_url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Module_song_instrument_id_fkey" FOREIGN KEY ("song_instrument_id") REFERENCES "SongInstrument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "module_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Material_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SongInstrument_song_id_instrument_id_key" ON "SongInstrument"("song_id", "instrument_id");

-- CreateIndex
CREATE UNIQUE INDEX "Module_song_instrument_id_difficulty_level_key" ON "Module"("song_instrument_id", "difficulty_level");
