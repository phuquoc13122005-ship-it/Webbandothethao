-- Database schema generated from redme.md proposal
-- Source proposal:
-- users(id, name, email, password, role, avatar)
-- products(id, name, price, stock, category_id, image)
-- orders(id, user_id, total, status)
-- order_items(id, order_id, product_id, quantity)
-- reviews(id, user_id, product_id, rating, comment)
-- wishlist(id, user_id, product_id)

create database if not exists webbandothethao
  character set utf8mb4
  collate utf8mb4_unicode_ci;

use webbandothethao;

create table if not exists categories (
  id bigint unsigned auto_increment primary key,
  name varchar(150) not null,
  slug varchar(180) not null unique,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists users (
  id bigint unsigned auto_increment primary key,
  name varchar(150) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  role enum('user', 'staff', 'admin') not null default 'user',
  avatar varchar(1000) null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp
);

create table if not exists products (
  id bigint unsigned auto_increment primary key,
  name varchar(255) not null,
  price decimal(12,2) not null,
  stock int unsigned not null default 0,
  category_id bigint unsigned null,
  image varchar(1000) null,
  description text null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_products_category foreign key (category_id) references categories(id) on delete set null,
  constraint chk_products_price check (price >= 0)
);

create table if not exists orders (
  id bigint unsigned auto_increment primary key,
  user_id bigint unsigned not null,
  total decimal(12,2) not null default 0,
  status enum('pending', 'confirmed', 'shipping', 'delivered', 'cancelled') not null default 'pending',
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_orders_user foreign key (user_id) references users(id) on delete cascade,
  constraint chk_orders_total check (total >= 0)
);

create table if not exists order_items (
  id bigint unsigned auto_increment primary key,
  order_id bigint unsigned not null,
  product_id bigint unsigned not null,
  quantity int unsigned not null default 1,
  unit_price decimal(12,2) not null default 0,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_order_items_order foreign key (order_id) references orders(id) on delete cascade,
  constraint fk_order_items_product foreign key (product_id) references products(id) on delete restrict,
  constraint chk_order_items_quantity check (quantity > 0)
);

create table if not exists reviews (
  id bigint unsigned auto_increment primary key,
  user_id bigint unsigned not null,
  product_id bigint unsigned not null,
  rating tinyint unsigned not null,
  comment text null,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp on update current_timestamp,
  constraint fk_reviews_user foreign key (user_id) references users(id) on delete cascade,
  constraint fk_reviews_product foreign key (product_id) references products(id) on delete cascade,
  constraint chk_reviews_rating check (rating between 1 and 5),
  unique key uq_review_user_product (user_id, product_id)
);

create table if not exists wishlist (
  id bigint unsigned auto_increment primary key,
  user_id bigint unsigned not null,
  product_id bigint unsigned not null,
  created_at timestamp not null default current_timestamp,
  constraint fk_wishlist_user foreign key (user_id) references users(id) on delete cascade,
  constraint fk_wishlist_product foreign key (product_id) references products(id) on delete cascade,
  unique key uq_wishlist_user_product (user_id, product_id)
);

create index idx_products_category on products(category_id);
create index idx_orders_user_status on orders(user_id, status);
create index idx_order_items_order on order_items(order_id);
create index idx_reviews_product on reviews(product_id);
create index idx_wishlist_user on wishlist(user_id);

-- Optional seed accounts from redme.md test section
-- NOTE: For production, store hashed passwords (bcrypt/argon2), not plain text.
insert into users (name, email, password, role, avatar)
values
  ('Admin', 'admin@gmail.com', '123456', 'admin', null),
  ('Staff', 'staff@gmail.com', '123456', 'staff', null),
  ('User', 'user@gmail.com', '123456', 'user', null)
on duplicate key update
  name = values(name),
  role = values(role);
