import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ItemCategory } from '../types';
import { CartItem } from './cartItem';

@Entity({ name: 'items' })
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ItemCategory })
  category: ItemCategory;

  @Column({ nullable: true })
  attribute: string;

  @Column({ type: 'smallint' })
  price: number;

  @Column({ type: 'smallint', nullable: true, default: null })
  reducedPrice: number;

  @Column({ nullable: true })
  infos: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true, default: null })
  stock: number;

  @OneToMany(() => CartItem, (cartitem) => cartitem.item)
  cartItems: CartItem[];
}
