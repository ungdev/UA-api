import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'settings' })
export default class SettingModel {
  @PrimaryColumn()
  id: string;

  @Column()
  value: string;
}
