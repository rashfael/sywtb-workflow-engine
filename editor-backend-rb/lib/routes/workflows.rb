# frozen_string_literal: true

require "roda"
require "json"
require_relative "../auth/middleware"
require_relative "../models/user"
require_relative "../models/workflow"

# Workflow REST routes (authenticated)
class WorkflowRoutes < Roda
  plugin :json
  plugin :json_parser
  plugin :halt

  # Apply auth middleware
  use Auth::Middleware

  route do |r|
    # Access JWT payload set by middleware
    jwt_payload = r.env["jwt.payload"]
    owner_email = jwt_payload[:sub]
    owner = User.find_by!(email: owner_email)

    # GET /workflows - List user's workflows
    r.get do
      workflows = Workflow.where(owner: owner)
      workflows.map do |w|
        {
          id: w.id,
          label: w.label,
          owner: owner_email,
          created_at: w.created_at,
          updated_at: w.updated_at
        }
      end
    end

    # POST /workflows - Create a new workflow
    r.post do
      id = r.params["id"] || r.params["_id"]
      label = r.params["label"]

      request.halt(400, { error: "Label is required" }) if label.nil? || label.empty?

      workflow = Workflow.create!(
        id: id, # Can be nil, will be generated
        label: label,
        owner: owner
      )

      {
        id: workflow.id,
        label: workflow.label,
        owner: owner_email,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at
      }
    end
  end
end
