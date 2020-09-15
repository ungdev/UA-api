import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm';
import { ItemCategory } from '../types';
import CartItemModel from './cartItem';

@Entity({ name: 'items' })
export default class ItemModel {
  @PrimaryColumn()
  id: string;

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

  @OneToMany(() => CartItemModel, (cartItem) => cartItem.item)
  cartItems: CartItemModel[];
}
