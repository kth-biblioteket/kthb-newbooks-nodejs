CREATE USER 'newbooks'@'localhost' IDENTIFIED BY 'xxxxxxxxxxxxxxx'

--
-- Databas: `newbooks`
--
CREATE DATABASE IF NOT EXISTS `newbooks` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `newbooks`;

GRANT SELECT, UPDATE, INSERT, DELETE ON newbooks.* TO 'newbooks'@'localhost'

-- --------------------------------------------------------

--
-- Tabellstruktur `newbooks`
--

CREATE TABLE IF NOT EXISTS `books` (
  `id` int(11) NOT NULL,
  `mmsid` varchar(50) NOT NULL,
  `recordid` varchar(100) NOT NULL,
  `isbn` varchar(500) NOT NULL,
  `isbnprimo` varchar(100) DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `coverurl` varchar(500) DEFAULT NULL,
  `title` varchar(500) NOT NULL,
  `activationdate` date NOT NULL,
  `publicationdate` varchar(10) NOT NULL,
  `dewey` varchar(100) NOT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `category` varchar(500) DEFAULT NULL,
  `subcategory` varchar(500) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=376424 DEFAULT CHARSET=utf8;


-- --------------------------------------------------------

--
-- Tabellstruktur `systemlog`
--

CREATE TABLE IF NOT EXISTS `systemlog` (
  `id` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `info` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Index för dumpade tabeller
--

--
-- Index för tabell `newbooks`
--
ALTER TABLE `books`
  ADD PRIMARY KEY (`id`);

--
-- Index för tabell `systemlog`
--
ALTER TABLE `systemlog`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT för dumpade tabeller
--

--
-- AUTO_INCREMENT för tabell `newbooks`
--
ALTER TABLE `books`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT för tabell `systemlog`
--
ALTER TABLE `systemlog`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;