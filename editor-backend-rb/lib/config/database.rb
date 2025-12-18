# frozen_string_literal: true

require "active_record"
require "yaml"
require "erb"

# Determine environment
ENV["RACK_ENV"] ||= "development"

# Load database configuration
db_config_file = File.join(__dir__, "../../db/config.yml")
db_config = YAML.safe_load(ERB.new(File.read(db_config_file)).result, aliases: true)
ActiveRecord::Base.establish_connection(db_config[ENV["RACK_ENV"]])

# Enable logging in development
if ENV["RACK_ENV"] == "development"
  ActiveRecord::Base.logger = Logger.new($stdout)
  ActiveRecord::Base.logger.level = Logger::DEBUG
end
