# frozen_string_literal: true

class CreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users, id: :uuid do |t|
      t.string :email, null: false
      t.string :password_hash, null: false

      t.timestamps

      t.index :email, unique: true
    end
  end
end
