# frozen_string_literal: true

require "roda"
require "json"
require_relative "../auth/helpers"
require_relative "../models/user"

# Authentication routes
class AuthRoutes < Roda
  plugin :json
  plugin :json_parser
  plugin :halt

  route do |r|
    # POST /auth/login
    r.post "login" do
      email = r.params["email"]
      password = r.params["password"]

      request.halt(400, { error: "Email and password required" }) if email.nil? || password.nil?

      user = User.find_by(email: email)

      if user.nil?
        # Create user if they don't exist (matching Node.js behavior)
        password_hash = Auth.hash_password(password)
        user = User.create!(email: email, password_hash: password_hash)
      else
        # Verify password
        unless Auth.verify_password(password, user.password_hash)
          request.halt(401, { message: "Invalid credentials" })
        end
      end

      { token: Auth.generate_token(email) }
    end

    # GET /auth/me
    r.get "me" do
      token = extract_bearer_token(r)
      request.halt(401, { error: "No token provided" }) if token.nil?

      begin
        payload = Auth.verify_token(token)
        payload
      rescue JWT::DecodeError => e
        request.halt(401, { error: "Invalid token", details: e.message })
      end
    end
  end

  private

  def extract_bearer_token(request)
    auth_header = request.env["HTTP_AUTHORIZATION"]
    return nil if auth_header.nil?

    match = auth_header.match(/^Bearer\s+(.+)$/i)
    match&.[](1)
  end
end
