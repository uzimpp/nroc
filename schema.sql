-- -------------------------------------------------------------
-- Table: sensors
-- Stores IoT sensor readings from farm locations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sensors` (
  `id`           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `farm_id`      VARCHAR(50)      NOT NULL COLLATE utf8mb3_general_ci,
  `lat`          DECIMAL(9,6)     NOT NULL,
  `lon`          DECIMAL(9,6)     NOT NULL,
  `moisture_raw` INT              DEFAULT NULL,
  `moisture`     DECIMAL(5,2)     DEFAULT NULL,
  `light`        DECIMAL(8,2)     DEFAULT NULL,
  `temperature`  DECIMAL(6,2)     DEFAULT NULL,
  `humidity`     DECIMAL(6,2)     DEFAULT NULL,
  `temp_i2c`     DECIMAL(8,5)     DEFAULT NULL,
  `created_at`   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_farm_id` (`farm_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;


-- -------------------------------------------------------------
-- Table: growth
-- Stores crop growth tracking data per farm/plant
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `growth` (
  `id`                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `farm_id`               VARCHAR(50)  NOT NULL,
  `growth_progress_in_gdd` VARCHAR(255) NOT NULL,
  `height`                FLOAT        DEFAULT NULL,
  `n_ears`                INT          DEFAULT NULL,
  `notes`                 TEXT         DEFAULT NULL,
  `created_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_farm_id` (`farm_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: market_prices
-- Stores agricultural product prices fetched from market API
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `market_prices` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`     INT NOT NULL,
  `product_name`   VARCHAR(255) NOT NULL,
  `record_date`    DATE NOT NULL,
  `price_min`      DECIMAL(10,2) DEFAULT NULL,
  `price_max`      DECIMAL(10,2) DEFAULT NULL,
  `unit`           VARCHAR(50) DEFAULT 'kg.',
  `fetched_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_date` (`product_id`, `record_date`),
  INDEX `idx_product_id` (`product_id`),
  INDEX `idx_record_date` (`record_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: weather_forecast_hourly
-- Stores hourly weather forecast data from TMD NWP API
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `weather_forecast_hourly` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lat`               DECIMAL(9,6) NOT NULL,
  `lon`               DECIMAL(9,6) NOT NULL,
  `forecast_datetime` DATETIME NOT NULL,
  `temperature`       DECIMAL(6,2) DEFAULT NULL,
  `humidity`          DECIMAL(5,2) DEFAULT NULL,
  `pressure`          DECIMAL(6,2) DEFAULT NULL,
  `rain`              DECIMAL(6,2) DEFAULT NULL,
  `wind_speed`        DECIMAL(6,2) DEFAULT NULL,
  `wind_dir`          DECIMAL(6,2) DEFAULT NULL,
  `cond`              INT DEFAULT NULL,
  `created_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_location_time` (`lat`, `lon`, `forecast_datetime`),
  INDEX `idx_lat_lon` (`lat`, `lon`),
  INDEX `idx_forecast_datetime` (`forecast_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- -------------------------------------------------------------
-- Table: weather_forecast_daily
-- Stores daily weather forecast data from TMD NWP API
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `weather_forecast_daily` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lat`               DECIMAL(9,6) NOT NULL,
  `lon`               DECIMAL(9,6) NOT NULL,
  `forecast_date`     DATE NOT NULL,
  `temp_max`          DECIMAL(6,2) DEFAULT NULL,
  `temp_min`          DECIMAL(6,2) DEFAULT NULL,
  `humidity`          DECIMAL(5,2) DEFAULT NULL,
  `pressure`          DECIMAL(6,2) DEFAULT NULL,
  `rain`              DECIMAL(6,2) DEFAULT NULL,
  `wind_speed`        DECIMAL(6,2) DEFAULT NULL,
  `wind_dir`          DECIMAL(6,2) DEFAULT NULL,
  `cond`              INT DEFAULT NULL,
  `created_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_location_date` (`lat`, `lon`, `forecast_date`),
  INDEX `idx_lat_lon` (`lat`, `lon`),
  INDEX `idx_forecast_date` (`forecast_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;