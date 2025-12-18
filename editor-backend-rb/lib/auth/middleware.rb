# frozen_string_literal: true

require_relative "helpers"

# Middleware for JWT authentication
module Auth
  class Middleware
    def initialize(app)
      @app = app
    end

    def call(env)
      auth_header = env["HTTP_AUTHORIZATION"]

      if auth_header.nil?
        return unauthorized_response("No authorization header")
      end

      match = auth_header.match(/^Bearer\s+(.+)$/i)
      if match.nil?
        return unauthorized_response("Invalid authorization header format")
      end

      token = match[1]

      begin
        payload = Auth.verify_token(token)
        env["jwt.payload"] = payload
        @app.call(env)
      rescue JWT::ExpiredSignature
        unauthorized_response("Token has expired")
      rescue JWT::DecodeError => e
        unauthorized_response("Invalid token: #{e.message}")
      end
    end

    private

    def unauthorized_response(message)
      [
        401,
        { "Content-Type" => "application/json" },
        [{ error: message }.to_json]
      ]
    end
  end
end
